import { NextResponse } from "next/server";
import { getOpenAI, CHAT_MODEL } from "../../../lib/openai";
import { retrieveKnowledge } from "../../../lib/retrieval";
import { buildGroundedInput, buildTarotInstructions } from "../../../lib/tarot-prompt";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const question = String(body?.question || "").trim();
    const tarotSystem = body?.tarotSystem ? String(body.tarotSystem) : null;

    if (!question) {
      return NextResponse.json({ error: "請先輸入問題。" }, { status: 400 });
    }

    if (question.length > 1200) {
      return NextResponse.json({ error: "問題太長，請控制在 1200 字元內。" }, { status: 400 });
    }

    const chunks = await retrieveKnowledge(question, {
      tarotSystem,
      matchCount: 8,
    });

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          answer: "目前知識庫沒有找到足夠相關的原書內容。請先完成書籍 ingestion，或換一個更具體的問題。",
          sources: [],
        },
        { status: 200 },
      );
    }

    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: CHAT_MODEL,
      instructions: buildTarotInstructions(),
      input: buildGroundedInput(question, chunks),
    });

    const sources = chunks.map((chunk) => ({
      book: chunk.book_title,
      author: chunk.author,
      chapter: chunk.chapter,
      chunkIndex: chunk.chunk_index,
      similarity: chunk.similarity,
    }));

    return NextResponse.json({
      answer: response.output_text || "目前沒有產生可顯示的回答。",
      sources,
    });
  } catch (error) {
    console.error("/api/ask failed", error);
    return NextResponse.json(
      { error: "AskVela 目前無法完成查詢，請檢查環境變數、Supabase migration 與知識庫資料。" },
      { status: 500 },
    );
  }
}
