import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function mapFormFieldsWithGemini(base64Data: string, mimeType: string, userProfile: any) {
  const prompt = `
You are an intelligent form-filling assistant with vision capabilities. 
I am providing you with an image of a blank form and a JSON object containing the user's actual personal information.

Your task is to visually analyze the form image, identify what fields the form is asking for, and map the correct value from the User Profile Data to that field.

CRITICAL INSTRUCTIONS FOR ALIGNMENT AND COORDINATES:
- NEVER return the coordinates of the printed label. You must find the actual BLANK LINE or EMPTY BOX associated with the label.
- You must provide the exact 'x', 'y', 'width', and 'height' (as percentages, 0 to 100) for the empty blank space where the text belongs.
- The 'x' coordinate MUST be the exact starting point (left edge) of the blank space.
- The 'y' coordinate MUST represent the TOP EDGE of the empty blank space or line, not the baseline.
- If you point to the baseline, the text will be printed downwards and strike through the line. You must point to the TOP of the space where the text should begin vertically.

CRITICAL INSTRUCTIONS FOR FORM CONDITIONS:
- Date Formats: Look closely at the physical boxes for the date. If the form has individual square boxes for each digit (e.g., [D][D] [M][M] [Y][Y][Y][Y]), you MUST add a space between each character in your mappedValue (e.g., "2   6   0   4   2   0   0   5") so the PDF generator spaces them out correctly into the boxes.
- Checkboxes/Radio Buttons: Output "X" or "✓" and set the coordinates EXACTLY over the center of the correct box.
- Read ALL instructions on the form and format the mapped values exactly as the form requires (e.g., ALL CAPS if requested).

Return a JSON array of mapped fields.

User Profile Data:
${JSON.stringify(userProfile)}
  `;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            fieldLabel: { 
              type: SchemaType.STRING,
              description: "The name of the field as found on the blank form (e.g. 'Applicant Name')"
            },
            mappedValue: { 
              type: SchemaType.STRING,
              description: "The value from the User Profile Data that belongs in this field"
            },
            x: {
              type: SchemaType.NUMBER,
              description: "The X coordinate (0-100 percentage) from the left edge"
            },
            y: {
              type: SchemaType.NUMBER,
              description: "The Y coordinate (0-100 percentage) representing the baseline"
            },
            width: {
              type: SchemaType.NUMBER,
              description: "The total width (0-100 percentage) of the empty space"
            },
            height: {
              type: SchemaType.NUMBER,
              description: "The height (0-100 percentage) of the empty space/box"
            }
          },
          required: ["fieldLabel", "mappedValue", "x", "y", "width", "height"]
        }
      }
    }
  });

  try {
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch(e) {
    console.error("Gemini Mapping Error", e);
    return [];
  }
}
