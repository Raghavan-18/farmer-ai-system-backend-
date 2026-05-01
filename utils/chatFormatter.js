/**
 * Formats the AI response into either a structured object or a conversational message.
 * @param {string} aiResponse - The raw text response from the AI.
 * @returns {object} Formatted response object.
 */
function formatChatResponse(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    return { type: "conversation", message: "" };
  }

  // These variables define what the AI's section headers look like
  const diagKeywords = ['diagnosis', 'நோய் கண்டறிதல்'];
  const causeKeywords = ['cause', 'காரணம்'];
  const recKeywords = ['recommendations', 'பரிந்துரைகள்'];
  const precKeywords = ['precautions', 'முன்னெச்சரிக்கைகள்', 'முன்னெச்சரிக்கை'];

  // All keywords combined to check if the AI used structured formatting
  const allKeywords = [...diagKeywords, ...causeKeywords, ...recKeywords, ...precKeywords];

  const lines = aiResponse.split('\n').map(line => line.trim());
  
  // Scans the AI's response to see if it contains any of the above headers
  const isStructuredFormatting = lines.some(line => {
    const cleanedLine = line.toLowerCase().replace(/:/g, '').trim();
    return allKeywords.includes(cleanedLine);
  });

  // If the AI didn't use the structured headers, return the exact AI response naturally
  if (!isStructuredFormatting) {
    return {
      type: "conversation",
      message: aiResponse.trim()
    };
  }

  let currentSection = null;
  const diagnosisLines = [];
  const causeLines = [];
  const recommendationLines = [];
  const precautionLines = [];

  for (const line of lines) {
    const cleanedLine = line.toLowerCase().replace(/:/g, '').trim();
    
    if (diagKeywords.includes(cleanedLine)) {
      currentSection = 'diagnosis';
      continue;
    } else if (causeKeywords.includes(cleanedLine)) {
      currentSection = 'cause';
      continue;
    } else if (recKeywords.includes(cleanedLine)) {
      currentSection = 'recommendations';
      continue;
    } else if (precKeywords.includes(cleanedLine)) {
      currentSection = 'precautions';
      continue;
    }

    if (line !== '') {
      if (currentSection === 'diagnosis') {
        diagnosisLines.push(line);
      } else if (currentSection === 'cause') {
        causeLines.push(line);
      } else if (currentSection === 'recommendations') {
        recommendationLines.push(line.replace(/^[-\*•]\s*/, '').trim());
      } else if (currentSection === 'precautions') {
        precautionLines.push(line.replace(/^[-\*•]\s*/, '').trim());
      }
    }
  }

  return {
    type: "structured",
    diagnosis: diagnosisLines.join(' ').trim(),
    cause: causeLines.join(' ').trim(),
    recommendations: recommendationLines,
    precautions: precautionLines
  };
}

module.exports = { formatChatResponse };
