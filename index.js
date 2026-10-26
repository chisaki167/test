    const apiKeyInput = document.getElementById("apiKey");
    const recordButton = document.getElementById("recordButton");
    const stopButton = document.getElementById("stopButton");
    const sendButton = document.getElementById("sendButton");
    const clearButton = document.getElementById("clearButton");
    const textInput = document.getElementById("textInput");
    const conversationElement = document.getElementById("conversation");
    const statusElement = document.getElementById("status");
    const audioPlayer = document.getElementById("audioPlayer");

    let recorder;
    let microphoneStream;
    let audioChunks = [];
    let busy = false;
    let conversation = [];
    let audioObjectUrl;

    function setStatus(message, kind = "") {
      statusElement.textContent = message;
      statusElement.className = `status ${kind}`;
    }

    function setBusy(value) {
      busy = value;
      sendButton.disabled = value;
      recordButton.disabled = value || Boolean(recorder);
      textInput.disabled = value;
    }

    function addMessage(role, text) {
      const article = document.createElement("article");
      article.className = `message ${role}`;
      const label = document.createElement("strong");
      label.textContent = role === "user" ? "Bạn" : "Trợ lý";
      const content = document.createElement("div");
      content.textContent = text;
      article.append(label, content);
      conversationElement.append(article);
      conversationElement.scrollTop = conversationElement.scrollHeight;
    }

    async function readError(response) {
      let message = `Yêu cầu thất bại (HTTP ${response.status}).`;
      try {
        const data = await response.json();
        if (data.error && data.error.message) message = data.error.message;
      } catch {
        message = `Yêu cầu thất bại (HTTP ${response.status}).`;
      }
      return message;
    }

    function getKey() {
      const key = apiKeyInput.value.trim();
      if (!key) throw new Error("nhập key open ai.");
      return key;
    }

    async function transcribeAudio(blob) {
      const form = new FormData();
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      form.append("file", blob, `ghi-am.${extension}`);
      form.append("model", "gpt-4o-mini-transcribe");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${getKey()}` },
        body: form
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      if (!data.text || !data.text.trim()) throw new Error("Không nhận diện được lời nói. Bạn thử ghi âm lại nhé.");
      return data.text.trim();
    }

    async function askAssistant(text) {
      const nextConversation = [...conversation, { role: "user", content: text }];
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Bạn là trợ lý thân thiện, trả lời bằng tiếng Việt rõ ràng và ngắn gọn." },
            ...nextConversation
          ]
        })
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      const answer = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "";
      if (!answer) throw new Error("OpenAI không trả về nội dung. Vui lòng thử lại.");
      conversation = [...nextConversation, { role: "assistant", content: answer }];
      return answer;
    }

    async function speak(text) {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getKey()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: "alloy",
          input: text,
          response_format: "mp3"
        })
      });
      if (!response.ok) throw new Error(await readError(response));
      const audioBlob = await response.blob();
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
      audioObjectUrl = URL.createObjectURL(audioBlob);
      audioPlayer.src = audioObjectUrl;
      audioPlayer.hidden = false;
      await audioPlayer.play();
    }

    async function processText(text) {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      try {
        getKey();
        setBusy(true);
        addMessage("user", trimmed);
        setStatus("Đang tạo câu trả lời...");
        const answer = await askAssistant(trimmed);
        addMessage("assistant", answer);
        setStatus("Đang tạo giọng nói...");
        try {
          await speak(answer);
          setStatus("Đã trả lời xong.", "success");
        } catch (error) {
          setStatus(`Đã có câu trả lời nhưng phát giọng nói không thành công: ${error.message}`, "error");
        }
      } catch (error) {
        setStatus(error.message, "error");
      } finally {
        setBusy(false);
      }
    }

    recordButton.addEventListener("click", async () => {
      try {
        getKey();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Trình duyệt không hỗ trợ micro. Hãy mở bằng Chrome hoặc Edge.");
        }
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
          .find(type => MediaRecorder.isTypeSupported(type));
        recorder = mimeType ? new MediaRecorder(microphoneStream, { mimeType }) : new MediaRecorder(microphoneStream);
        audioChunks = [];
        recorder.addEventListener("dataavailable", event => {
          if (event.data.size) audioChunks.push(event.data);
        });
        recorder.addEventListener("stop", async () => {
          const blob = new Blob(audioChunks, { type: recorder.mimeType || "audio/webm" });
          microphoneStream.getTracks().forEach(track => track.stop());
          microphoneStream = null;
          recorder = null;
          stopButton.disabled = true;
          recordButton.disabled = true;
          if (!blob.size) {
            setStatus("Không ghi được âm thanh. Hãy thử lại.", "error");
            recordButton.disabled = false;
            return;
          }
          try {
            setBusy(true);
            setStatus("Đang nhận diện giọng nói...");
            const transcript = await transcribeAudio(blob);
            textInput.value = transcript;
            await processText(transcript);
          } catch (error) {
            setStatus(error.message, "error");
          } finally {
            setBusy(false);
            recordButton.disabled = false;
          }
        }, { once: true });
        recorder.start();
        recordButton.disabled = true;
        stopButton.disabled = false;
        setStatus("Đang nghe... Bấm “Dừng và gửi” khi bạn nói xong.");
      } catch (error) {
        if (microphoneStream) microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
        recorder = null;
        stopButton.disabled = true;
        recordButton.disabled = false;
        setStatus(error.message, "error");
      }
    });

    stopButton.addEventListener("click", () => {
      if (recorder && recorder.state !== "inactive") {
        stopButton.disabled = true;
        recorder.stop();
      }
    });

    sendButton.addEventListener("click", async () => {
      const text = textInput.value;
      textInput.value = "";
      await processText(text);
    });

    textInput.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        sendButton.click();
      }
    });

    clearButton.addEventListener("click", () => {
      conversation = [];
      conversationElement.replaceChildren();
      textInput.value = "";
      audioPlayer.pause();
      audioPlayer.removeAttribute("src");
      audioPlayer.hidden = true;
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
      audioObjectUrl = null;
      setStatus("Đã xóa hội thoại.");
    });