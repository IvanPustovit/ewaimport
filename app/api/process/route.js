// app/api/process/route.js
export async function POST(req) {
    try {
        const { inputData, token } = await req.json()
        if (!inputData) {
            return new Response(
                JSON.stringify({ error: "Дані та токен обов'язкові" }),
                { status: 400 }
            )
        }

        // Функція обробки рядків
        const processStringBlock = (input) =>
            input.split("\n").map((str) => str.trim())

        // Отримуємо масив контрактів
        const contractNumbers = processStringBlock(inputData)

        const getToken = async () => {
            try {
        const response = await fetch("https://istudio.uniqa.ua/webapi/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "password",
                username: "ewaapi",
                password: "EWAEWA",
            }),
        })

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

        // Функція для виклику API
        async function processContracts(contractNumbers) {
            const apiUrls = [
                "https://raif.eua.in.ua/eua/api/v16/contract/code",
                "https://istudio.uniqa.ua/webapi/api/icdintegration/gettariff",
                "https://istudio.uniqa.ua/webapi/api/icdintegration/setcontract",
            ]

            const results = []

            for (let contractNumber of contractNumbers) {
                try {
                    let sessionId = await fetchAuthToken()
                    let response1 = await fetch(
                        `${apiUrls[0]}/${contractNumber}`,
                        {
                            headers: {
                                "Content-Type": "application/json",
                                Cookie: `JSESSIONID=${sessionId}`,
                            },
                            method: "GET",
                        }
                    )

                    if (!response1.ok){
                    if (response1.status === 404) {
                        throw new Error(`Помилка Step1: договір не знайдено`)}
                    else {
                        throw new Error(`Помилка Step1: ${response1.status}`)}
                    }
                    let data1 = await response1.json()

                    let response2 = await fetch(apiUrls[1], {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${await getToken()}`,
                        },
                        body: JSON.stringify(data1),
                    })

                    if (!response2.ok)
                        throw new Error(`Помилка Step2: ${response2.status}`)
                    let data2 = await response2.json()
                    results.push({ contractNumber, data2 })

                    let response3 = await fetch(apiUrls[2], {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(data2),
                    })

                    if (!response3.ok)
                        throw new Error(`Помилка Step3: ${response3.status}`)
                    let finalData = await response3.json()

                    results.push({ contractNumber, finalData })
                } catch (error) {
                    console.error(
                        `Помилка обробки ${contractNumber}:`,
                        error.message
                    )
                    results.push({ contractNumber, error: error.message })
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
