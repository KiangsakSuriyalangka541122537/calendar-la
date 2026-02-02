
import { GoogleGenAI } from "@google/genai";
import { LeaveRecord, Employee, LeaveType } from "../types";

export const analyzeLeaveData = async (
  employeeName: string,
  leaves: LeaveRecord[],
  allEmployees: Employee[]
): Promise<string> => {
  try {
    // Initialize Gemini Client strictly following guidelines
    // Always use process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Find the employee to get their ID for filtering leaves
    const targetEmployee = allEmployees.find(e => e.name === employeeName);
    if (!targetEmployee) {
      return "ไม่พบข้อมูลบุคลากร";
    }

    const employeeLeaves = leaves.filter(l => l.employeeId === targetEmployee.id);

    const context = `
      ข้อมูลการลาของบุคลากรชื่อ: ${employeeName}
      รายการลาทั้งหมด: ${JSON.stringify(employeeLeaves)}
      ประเภทการลาที่มี: ${Object.values(LeaveType).join(', ')}
    `;

    // Use ai.models.generateContent to query GenAI with both the model name and prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        ${context}
        
        ช่วยวิเคราะห์สรุปพฤติกรรมการลาของบุคลากรคนนี้ให้หน่อย โดยตอบเป็นภาษาไทย
        1. สรุปจำนวนวันลาแต่ละประเภท
        2. แนวโน้มการลา (เช่น ลาป่วยบ่อยช่วงต้นปี)
        3. ข้อความให้กำลังใจสั้นๆ
      `,
    });

    // The GenerateContentResponse object features a text property (not a method, so do not call text())
    return response.text || "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI หรือ API Key ไม่ถูกต้อง (กรุณาตรวจสอบการตั้งค่า Netlify)";
  }
};
