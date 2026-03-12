import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SEQ_CTX, CH_R, COPY_EXAMPLES } from "@/lib/constants";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { lecture, instructorName, seqId, item, lectureName } = await req.json();

    const ctx = SEQ_CTX[seqId] || "상황에 맞게 작성";
    const chr = CH_R[item.ch] || "채널 특성에 맞게";

    const res = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `한국 온라인교육 CRM 카피라이터. 핏크닉/머니업클래스 무료라이브→유료전환 카피 작성.
원칙: 1)한국어 자연스러운 구어체, AI냄새/번역투 금지 2)짧은줄 나누기(줄당15자) 3)채널규칙 엄수 4)설명없이 카피본문만 출력 5)링크는 반드시 플레이스홀더 사용
채널: ${chr}
시퀀스: ${ctx}
${COPY_EXAMPLES}`,
      messages: [
        {
          role: "user",
          content: `"${item.ch}" 채널 "${item.name}" 카피 작성.
강사:${instructorName} 강의:${lectureName || lecture.type} 유형:${lecture.type} 톤:${lecture.tone} 타겟:${lecture.target}
USP:${(lecture.usps || []).join("/")} 증거:${(lecture.proof || []).join("/")}
스토리:${lecture.story || ""} 전자책:${lecture.ebook || ""} 날짜:${lecture.liveDate || ""} 시간:${lecture.liveTime || "19:30"}
링크 플레이스홀더만 사용. 카피 본문만:`,
        },
      ],
    });

    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    return NextResponse.json({ text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AI 생성 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
