// src/app/api/upload-base64/route.ts
import { NextRequest, NextResponse } from "next/server";

// @ts-ignore
import NeoCities from "neocities";
import fs from "fs/promises"; // Node.js file system with promises
import path from "path"; // Node.js path module
import os from "os"; // To get temporary directory

interface UploadBase64ApiPayload {
  fileNameOnNeocities: string; // Neocities에서의 최종 파일 경로 및 이름 (예: "assets/image.png")
  fileDataB64: string;
  username: string; // Neocities 사용자 이름
  password: string; // Neocities 비밀번호
}

export async function POST(request: NextRequest) {
  try {
    const payload: UploadBase64ApiPayload = await request.json();
    const { fileNameOnNeocities, fileDataB64, username, password } = payload;

    if (!fileNameOnNeocities || !fileDataB64) {
      return NextResponse.json(
        { message: "fileNameOnNeocities and fileDataB64 are required." },
        { status: 400 }
      );
    }

    // Base64 데이터에서 MIME 타입 프리픽스 제거 (예: "data:image/png;base64,")
    const base64Data = fileDataB64.startsWith("data:")
      ? fileDataB64.substring(fileDataB64.indexOf(",") + 1)
      : fileDataB64;

    // Base64 디코딩하여 Buffer 생성
    const fileBuffer = Buffer.from(base64Data, "base64");

    // 임시 파일 경로 생성 (Vercel의 /tmp 디렉토리 사용)
    // 임시 파일 이름은 충돌을 피하기 위해 고유하게 만듭니다. (예: 원래 파일명 일부 + timestamp)
    // 또는 단순하게 UUID 같은 것을 사용할 수도 있습니다.
    const tempFileName = `temp_${Date.now()}_${path.basename(
      fileNameOnNeocities
    )}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName); // os.tmpdir()은 /tmp를 반환 (Vercel 환경)

    // 디코딩된 데이터를 임시 파일로 저장
    await fs.writeFile(tempFilePath, fileBuffer);

    // Neocities API 클라이언트 초기화
    const apiClient = new NeoCities(username, password);

    // 업로드할 파일 정보 구성 (neocities 라이브러리가 요구하는 형식)
    const uploadPayload = [
      {
        name: fileNameOnNeocities, // Neocities에 저장될 이름 및 경로
        path: tempFilePath, // 서버에 임시 저장된 파일의 로컬 경로
      },
    ];

    // 파일 업로드 실행 (neocities 라이브러리의 upload 메소드는 콜백 기반일 수 있음)
    const uploadResponse: any = await new Promise((resolve, reject) => {
      apiClient.upload(uploadPayload, (resp: any) => {
        if (resp && resp.result === "success") {
          resolve(resp);
        } else {
          reject(
            new Error(
              resp.error_type || resp.message || "Neocities API upload failed"
            )
          );
        }
      });
    });

    // 업로드 후 임시 파일 삭제
    try {
      await fs.unlink(tempFilePath);
    } catch (unlinkError) {
      console.warn(`Failed to delete temp file: ${tempFilePath}`, unlinkError);
      // 임시 파일 삭제 실패는 업로드 성공/실패에 영향을 주지 않도록 처리할 수 있음
    }

    return NextResponse.json(
      {
        message: `File '${fileNameOnNeocities}' uploaded successfully to Neocities.`,
        details: uploadResponse,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API Base64 Upload Error:", error);
    // 만약 임시 파일이 생성되었다면, 에러 발생 시에도 삭제 시도
    // (tempFilePath 변수가 try 블록 스코프 내에 있으므로, 이 로직은 더 정교하게 처리해야 함)
    return NextResponse.json(
      { message: error.message || "File upload failed" },
      { status: 500 }
    );
  }
}
