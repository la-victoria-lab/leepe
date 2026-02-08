import OpenAI from 'openai';

let openaiClient: OpenAI | null = null

function getOpenAIClient() {
  if (openaiClient) return openaiClient
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  openaiClient = new OpenAI({ apiKey })
  return openaiClient
}

export async function extractISBNFromImage(image: File): Promise<string> {
  const openai = getOpenAIClient()
  if (!openai) return 'NOT_FOUND'

  const bytes = await image.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64Image = buffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract the ISBN barcode number from this image. Return ONLY the numeric ISBN code, nothing else. If you cannot find an ISBN, return "NOT_FOUND".',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${image.type};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 100,
  });

  return response.choices[0]?.message?.content?.trim() || 'NOT_FOUND';
}
