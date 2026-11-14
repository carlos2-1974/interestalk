import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

for await (const model of await ai.models.list()) {
  if (model.name?.includes("flash")) {
    console.log(model.name);
  }
}
