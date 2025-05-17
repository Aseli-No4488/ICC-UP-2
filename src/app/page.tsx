"use client"; // Client Component으로 명시

import { useState, useEffect, FormEvent } from "react";
import "./page.css";

const randomMessages = [
  "우리 본 적 있는 것 같은데?",
  "열심히 쵸작해줘서 고마워!",
  "이 사진 마음에 드는데?",
  "...",
  "헿",
  "이 사진은 어디서 구했어?",
  "으...",
  "쵸작하느라 고생 많아! 나도 최선을 다해 도와줄게!",
  "업로드가 빨리 되길!",
  "빨리 퀄리티 있는 내용을 고봉밥으로 달란 말이야!",
];
const randomMessagePercent = 0.07; // 7% 확률로 랜덤 메시지 출력

// LoginResponse 타입 정의
interface UploadResponse {
  message: string;
  details: string;
  status: string;
}

async function getHash(string: string): Promise<string> {
  // Return SHA-32
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(string)
  );
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

async function extractImagesFromJson(
  json: any,
  username: string,
  destination: string
): Promise<string[]> {
  const base64Lists: string[] = [];

  // 이미지 속성 검색
  const applyFunc = async (image: string) => {
    if (image.startsWith("data:image/")) {
      const base64Data = image.split(",")[1];
      base64Lists.push(base64Data);
      return `https://${username}.neocities.org/${destination}/${await getHash(
        base64Data
      )}.webp`;
    } else return image;
  };

  await imagePropSearcher(json, applyFunc);

  return base64Lists;
}

const targetProperties = [
  "image",
  "bgImage",
  "backgroundImage",
  "rowBackgroundImage",
];
async function imagePropSearcher(obj: any, applyFunc: any) {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;

  for (const prop of targetProperties) {
    if (obj.hasOwnProperty(prop)) {
      obj[prop] = await applyFunc(obj[prop]);
    }
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      await imagePropSearcher(obj[i], applyFunc);
    }
  } else {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        await imagePropSearcher(obj[key], applyFunc);
      }
    }
  }
  return obj;
}

export default function HomePage() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [check, setCheck] = useState<Boolean>(false);
  const [checkMessage, setCheckMessage] = useState<string>("Check");

  const [updating, setUpdating] = useState<boolean>(false);

  const [uploadMessage1, setUploadMessage1] = useState<string>("");
  const [uploadMessage2, setUploadMessage2] = useState<string>("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdating(true);

    setCheckMessage("Checking...");

    try {
      const response = await fetch("/api/upload", {
        // Next.js API Route
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileNameOnNeocities: "iccup2.txt",
          fileDataB64: "data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==", // 예시 Base64 데이터
          username: username,
          password: password,
        }),
      });

      const data: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.status || "Login failed");
      } else {
        setCheck(true);
        console.log("Login successful:", data);
      }
    } catch (error: any) {
      setCheckMessage("Error. Please retry");
      console.warn("Login error:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdating(true);

    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    const files = fileInput.files;

    const destinationInput = document.getElementById(
      "destination"
    ) as HTMLInputElement;
    const destination = destinationInput.value || ""; // 기본값은 빈 문자열

    if (!files || files.length === 0) {
      alert("Please select a file to upload.");
      setUpdating(false);
      return;
    }

    let file = files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      // Read json file
      const jsonData = e.target?.result;
      if (typeof jsonData === "string") {
        const json = JSON.parse(jsonData);
        console.log("Parsed JSON:", json);

        // Extract images from json
        let base64Lists: string[] = await extractImagesFromJson(
          json,
          username,
          destination
        );

        console.log("modified json:", json);

        const imagePannel = document.getElementById("image-pannel");
        setUploadMessage1(`총 ${base64Lists.length}개의 이미지를 찾았어!`);

        for (let i = 0; i < base64Lists.length; i++) {
          const base64Data = base64Lists[i];
          const filename = (await getHash(base64Data)) + ".webp";
          const img = new Image();

          // add image into .image-pannel
          setUploadMessage2(`(${i + 1} / ${base64Lists.length})...`);

          const fileNameOnNeocities = destination + "/" + filename; // Neocities에 저장될 이름 및 경로

          try {
            // Before uploading, check if the file already exists (image)
            const finalImageUrl =
              "https://" + username + ".neocities.org/" + fileNameOnNeocities;

            const isAlreadyExist = await new Promise((resolve) => {
              img.src = finalImageUrl;
              img.onload = () => {
                console.log("Image already exists:", finalImageUrl);
                resolve(true);
              };
              img.onerror = () => {
                resolve(false);
              };
              imagePannel?.prepend(img);
            });

            if (isAlreadyExist) {
              setUploadMessage1("이미 업로드된 건 생략하자!");
              continue;
            }

            // 확률로 랜덤 메시지 출력
            if (randomMessagePercent > Math.random()) {
              const randomIndex = Math.floor(
                Math.random() * randomMessages.length
              );
              setUploadMessage1(randomMessages[randomIndex]);
            }

            const response = await fetch("/api/upload", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fileNameOnNeocities: fileNameOnNeocities,
                fileDataB64: base64Data,
                username: username,
                password: password,
              }),
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.message || "Upload failed");
            } else {
              console.log("Upload successful:", data);

              // Reloading the image
              imagePannel?.removeChild(img);
              const newImg = new Image();
              newImg.src = finalImageUrl;
              imagePannel?.prepend(newImg);
              newImg.onerror = () => {
                // Try to reload the image
                setTimeout(() => {
                  newImg.src = finalImageUrl;
                }, 1000);
              };
            }
          } catch (error: any) {
            console.warn("Upload error:", error);
          } finally {
            setUpdating(false);
          }
        }

        // Download the modified json
        const modifiedJsonBlob = new Blob([JSON.stringify(json)], {
          type: "application/json",
        });
        const modifiedJsonUrl = URL.createObjectURL(modifiedJsonBlob);
        const a = document.createElement("a");
        a.href = modifiedJsonUrl;
        a.download = "project.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <main>
        <div id="user-pannel">
          <h1>ICC UP 2</h1>

          {!check && (
            <form onSubmit={handleLogin} style={{ marginBottom: "20px" }}>
              <div className="label-input-container">
                <label htmlFor="username">Neocity ID: </label>
                <input
                  id="username"
                  type="text"
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={updating}
                  required
                />
              </div>
              <div className="label-input-container">
                <label htmlFor="password">Neocity PW: </label>
                <input
                  id="password"
                  type="password"
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={updating}
                  required
                />
              </div>

              <button type="submit" style={{ marginTop: "10px" }}>
                {checkMessage}
              </button>
            </form>
          )}
          {check && (
            <form onSubmit={handleFileUpload} style={{ marginBottom: "20px" }}>
              <div className="label-input-container">
                <label htmlFor="fileInput">
                  <kbd>project.json</kbd> 업로드:{" "}
                </label>
                <input
                  id="fileInput"
                  type="file"
                  onChange={() => {}}
                  disabled={updating}
                />
              </div>
              <div className="label-input-container">
                <label>{"경로(default=iccup2): "}</label>
                <input
                  id="destination"
                  type="text"
                  placeholder="Destination (optional)"
                  defaultValue={"iccup2"}
                  onChange={() => {}}
                  disabled={updating}
                />
              </div>
              <button
                type="submit"
                disabled={updating}
                style={{ marginLeft: "10px" }}
              >
                {updating ? "Processing..." : "시작!"}
              </button>
            </form>
          )}
        </div>
        {check && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "start",
            }}
          >
            <h2>{uploadMessage1 + " - " + uploadMessage2}</h2>
            <div id="image-pannel">.</div>
          </div>
        )}
      </main>
    </>
  );
}
