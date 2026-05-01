const axios = require('axios');
const FormData = require('form-data');

const getAIResponse = async (cropType, growthStage, history, audioBase64, imageBase64, language = 'en') => {
  try {
    let finalQueryTextFromVoice = "";
    
    // 1. Process Voice if exists using Groq Whisper model
    if (audioBase64) {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const form = new FormData();
      form.append('file', audioBuffer, { filename: 'audio.m4a', contentType: 'audio/mp4' });
      form.append('model', 'whisper-large-v3');

      const whisperResponse = await axios.post(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          }
        }
      );
      
      finalQueryTextFromVoice = whisperResponse.data.text;
    }

    // 2. Build system prompt with strict follow-up classification
    const languageInstruction = language === 'ta'
      ? `MANDATORY LANGUAGE RULE: The farmer is using the Tamil language interface. You MUST respond ENTIRELY in Tamil script (தமிழ்) for EVERY response, no exceptions. Even if the user's message appears to be in English or contains English words, your ENTIRE response must be in Tamil. Do NOT include any English text in your response.`
      : `MANDATORY LANGUAGE RULE: Respond ENTIRELY in English.`;

    const systemPrompt = `You are an expert agricultural advisory assistant specializing in Indian farming, crop diseases, and soil health.

${languageInstruction}

You will receive the full conversation history. A hidden bracket block like [Current Context -> ...] shows the current crop and stage. DO NOT echo or repeat this bracket block back to the user.

---

STEP 1: CLASSIFY the latest user message:
  [NEW] = A completely new crop problem or disease being described for the first time, with no prior relevant context in the conversation.
  [FOLLOWUP] = Anything referencing the current conversation: urgency questions, asking what to do now, asking for specific product names, quantities, timing, next steps, clarification, "mention some", "give examples", "which one", "how much", "immediately", "இப்போது", "உடனே", "அடுத்து", "என்ன செய்ய", etc.

STEP 2: RESPOND based on classification:

${language === 'ta' ? `If [NEW] — use ONLY this exact format in Tamil:

  நோய் கண்டறிதல்:
  <என்ன பிரச்சனை என்பதை சுருக்கமாக எழுதவும்>

  காரணம்:
  <ஏன் இந்த பிரச்சனை ஏற்பட்டது — ஊட்டச்சத்து குறைபாடு, பூஞ்சை தொற்று, வானிலை, பூச்சி போன்றவை>

  பரிந்துரைகள்:
  - <பரிந்துரை 1>
  - <பரிந்துரை 2>
  - <பரிந்துரை 3>

  முன்னெச்சரிக்கைகள்:
  - <முன்னெச்சரிக்கை 1>
  - <முன்னெச்சரிக்கை 2>` : `If [NEW] — use ONLY this exact format:

  Diagnosis:
  <what the problem/disease is>

  Cause:
  <why this problem happened — e.g. nutrient deficiency, fungal infection, weather, pest, etc.>

  Recommendations:
  - <recommendation 1>
  - <recommendation 2>
  - <recommendation 3>

  Precautions:
  - <precaution 1>
  - <precaution 2>`}

If [FOLLOWUP]:
  - NEVER use the Diagnosis / Cause / Recommendations / Precautions format.
  - Respond in plain, helpful, conversational language (in Tamil if language is Tamil).
  - READ the full conversation history carefully — your answer must be DIRECTLY tied to the specific problem, disease, or advice already discussed.
  - If the farmer asks what to do immediately, give clear, ordered, actionable steps specific to the diagnosed problem.
  - If the farmer asks about a product, fertilizer, or quantity — name specific products used in India (brand names if possible), give dosage, and timing.
  - Do NOT give generic advice. Be specific to what was already diagnosed in this conversation.
  - Do NOT restart with a new diagnosis.
  - Keep the answer complete enough to be genuinely useful — don't cut it short.

---

CRITICAL: If there is ANY prior conversation, treat the message as [FOLLOWUP] unless the farmer is clearly describing a completely unrelated new problem.

Follow these rules exactly for every single response.`;


    // Determine which model to use:
    // - Vision-capable (llama-4-scout) for image requests
    // - llama-3.3-70b-versatile for text/voice (strong Tamil + agriculture accuracy)
    const selectedModel = imageBase64
      ? 'meta-llama/llama-4-scout-17b-16e-instruct'
      : 'llama-3.3-70b-versatile';

    // Map history to Groq format
    const groqMessages = history.map((msg, index) => {
      const isLastUser = (index === history.length - 1 && msg.role === 'user');
      
      // Ensure all non-last messages have plain string content
      let contentValue = Array.isArray(msg.content)
        ? (msg.content.find(c => c.type === 'text')?.text || msg.content.toString())
        : (msg.content || '');

      if (isLastUser) {
        const actualQuery = finalQueryTextFromVoice ? finalQueryTextFromVoice : contentValue;
        const textContent = `[Current Context -> Crop: ${cropType || 'Unknown'}, Stage: ${growthStage || 'Unknown'}]\n${actualQuery}`;
        
        if (imageBase64) {
          // Only the last message can have array (multimodal) content
          contentValue = [
            { type: 'text', text: textContent },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ];
        } else {
          contentValue = textContent;
        }
      }

      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: contentValue
      };
    });

    // Add System prompt at the very beginning
    groqMessages.unshift({ role: 'system', content: systemPrompt });

    // 3. Call Groq with chosen model (vision-capable or text-only)
    console.log(`[AI] Using model: ${selectedModel} | Image: ${!!imageBase64} | Voice: ${!!audioBase64}`);
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: selectedModel,
        messages: groqMessages
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      response: response.data.choices[0].message.content,
      transcript: finalQueryTextFromVoice || null
    };
    
  } catch (error) {
    const groqErrorMsg = error.response?.data?.error?.message || error.response?.data || error.message;
    console.error('AI Service Error:', groqErrorMsg);
    throw new Error('Groq API Error: ' + JSON.stringify(groqErrorMsg));
  }
};

module.exports = {
  getAIResponse
};
