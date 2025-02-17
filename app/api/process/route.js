// app/api/process/route.js
import connectToDatabase from "../../../lib/mongodb"
import Result from "../../../models/Result"

export async function POST(req) {
    try {
        const { inputData, token } = await req.json()

        let resultData = {
            contractNumber: "",
            data: "",
        }

        if (!inputData) {
            return new Response(JSON.stringify({ error: "Дані обов'язкові" }), {
                status: 400,
            })
        }

        // Функція обробки рядків
        const processStringBlock = (input) =>
            input.split("\n").map((str) => str.trim())

        // Отримуємо масив контрактів
        const contractNumbers = processStringBlock(inputData)

        const getToken = async () => {
            try {
                const response = await fetch(
                    "https://istudio.uniqa.ua/webapi/token",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            grant_type: "password",
                            username: "ewareimport",
                            password: "ewareimport2!",
                        }),
                    }
                )

                if (!response.ok) {
                    throw new Error("Network response was not ok")
                }

                const data = await response.json()
                return data.access_token
            } catch (error) {
                console.error(
                    { error: "Failed to fetch token" },
                    { status: 500 }
                )
                return null
            }
        }

        // Функція для отримання нового токена
        async function fetchAuthToken() {
            try {
                const response = await fetch(
                    "https://web.eua.in.ua/eua/api/v16/user/login",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            email: "ivan.pustovit@uniqa.ua",
                            password:
                                "59083ab5c6addab4f18cf41119b7ef79d0e91b39",
                        }),
                    }
                )

                if (!response.ok)
                    throw new Error(
                        `Помилка отримання токена: ${response.status}`
                    )
                const data = await response.json()
                return data.sessionId
            } catch (error) {
                console.error("Помилка отримання токена:", error.message)
                return null
            }
        }

        const getContractData = async (contractNumber, sessionId) => {
            let response1 = await fetch(
                `https://raif.eua.in.ua/eua/api/v16/contract/code/${contractNumber}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: `JSESSIONID=${sessionId}`,
                    },
                    method: "GET",
                }
            )

            return response1.json()
        }

        const getTariff = async (data1) => {
            let response2 = await fetch(
                "https://istudio.uniqa.ua/webapi/api/icdintegration/gettariff",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${await getToken()}`,
                    },
                    body: JSON.stringify(data1),
                }
            )
            return response2.json()
        }

        const setContract = async (data2) => {
            let response3 = await fetch(
                "https://istudio.uniqa.ua/webapi/api/icdintegration/setcontract",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${await getToken()}`,
                    },
                    body: JSON.stringify(data2),
                }
            )
            return response3.json()
        }
        // Підключення до бази даних
        await connectToDatabase()

        // Функція для виклику API
        async function processContracts(contractNumbers) {
            const results = []

            for (let contractNumber of contractNumbers) {
                try {
                    let sessionId = await fetchAuthToken()
                    let data1 = await getContractData(contractNumber, sessionId)

                    if (data1.state !== "SIGNED") {
                        throw new Error(
                            `Помилка Step1: договір не в статусі укладений`
                        )
                    } else {
                        let data2 = await getTariff(data1)

                        if (data2.ErrorCode) {
                            results.push({ contractNumber, data: data2 })
                            const result = new Result({
                                contractNumber,
                                data: data2.ErrorMsg,
                            })
                            await result.save()
                        } else {
                            let finalData = await setContract(data2)
                            results.push({ contractNumber, data: finalData })
                            const result = new Result({
                                contractNumber,
                                data: finalData,
                            })
                            await result.save()
                        }
                    }
                } catch (error) {
                    console.error(
                        `Помилка обробки ${contractNumber}:`,
                        error.message
                    )
                    results.push({ contractNumber, data: error.message })
                    const result = new Result({
                        contractNumber,
                        data: error.message,
                    })
                    await result.save()
                }
            }

            return results
        }

        const processedResults = await processContracts(contractNumbers)
        return new Response(JSON.stringify(processedResults), { status: 200 })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
        })
    }
}
