import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  testName: String,
  value: Number,
  unit: String,
  referenceMin: Number,
  referenceMax: Number,
  referenceText: String,
  status: { type: String, enum: ["within", "below", "above"] },
  explanation: String,
  medicalTitle: String,
  why: String,
  wellness: String,
  wellnessSourceUrl: String,
  wellnessSourceTitle: String,
  wellnessVersion: Number,
  professional: String,
  statusContext: String,
  method: String,
  medicalSource: String,
  medicalSourceOrganization: String,
  medicalSourceUrl: String
}, { _id: true });

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileName: String,
  storedFileName: String,
  fileType: String,
  reportDate: { type: Date, default: Date.now },
  uploadDate: { type: Date, default: Date.now },
  results: [resultSchema],
  source: { type: String, default: "upload" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Report", reportSchema);
