import mongoose from "mongoose"

const ResultSchema = new mongoose.Schema({
    contractNumber: String,
    data: mongoose.Schema.Types.Mixed,
})

export default mongoose.models.Result || mongoose.model("Result", ResultSchema)
