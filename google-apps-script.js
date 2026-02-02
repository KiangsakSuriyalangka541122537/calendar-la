
/**
 * Google Apps Script สำหรับระบบจัดการวันลา (เวอร์ชัน 2.0 - รองรับการบันทึกและดึงข้อมูลวันลา)
 * วิธีใช้: 
 * 1. วางโค้ดนี้แทนที่ของเดิมทั้งหมด
 * 2. **สำคัญ**: กด Deploy -> New deployment -> กด Deploy
 * 3. ตรวจสอบว่า URL Web App ยังคงเดิม หรือถ้าเปลี่ยนให้นำไปอัปเดตใน App.tsx
 */

const DEPARTMENTS = ["เวชระเบียนผู้ป่วยนอก", "เวชระเบียนผู้ป่วยใน", "ศูนย์ข้อมูล"];
const LEAVE_SHEET_NAME = "บันทึกการลา";

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 ระบบจัดการบุคลากร')
    .addItem('1. ตั้งค่าเริ่มต้น/สร้างตาราง', 'setupSheets')
    .addToUi();
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // สร้างตารางแผนก
  DEPARTMENTS.forEach(deptName => {
    let sheet = ss.getSheetByName(deptName);
    if (!sheet) {
      sheet = ss.insertSheet(deptName);
      sheet.appendRow(["ชื่อ - นามสกุล", "ตำแหน่ง"]);
      formatHeader(sheet);
    }
  });
  
  // สร้างตารางบันทึกการลา
  let leaveSheet = ss.getSheetByName(LEAVE_SHEET_NAME);
  if (!leaveSheet) {
    leaveSheet = ss.insertSheet(LEAVE_SHEET_NAME);
    leaveSheet.appendRow(["วันเวลาที่บันทึก", "ชื่อบุคลากร", "แผนก", "วันที่ลา", "ประเภทการลา"]);
    formatHeader(leaveSheet);
    leaveSheet.setColumnWidth(1, 150);
    leaveSheet.setColumnWidth(2, 200);
    leaveSheet.setColumnWidth(3, 150);
    leaveSheet.setColumnWidth(4, 120);
    leaveSheet.setColumnWidth(5, 120);
  }

  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1) ss.deleteSheet(sheet1);
  
  SpreadsheetApp.getUi().alert('✅ เตรียมตารางเรียบร้อยแล้ว!');
}

function formatHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setFontWeight("bold").setBackground("#e2e8f0").setFontFamily("Kanit");
}

/**
 * รับข้อมูลจากหน้าเว็บ (GET) - ดึงทั้งรายชื่อบุคลากร และ ข้อมูลการลา
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ดึงรายชื่อบุคลากร
  const allEmployees = [];
  DEPARTMENTS.forEach(deptName => {
    const sheet = ss.getSheetByName(deptName);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          allEmployees.push({
            id: deptName + "_" + i,
            name: data[i][0],
            position: data[i][1] || "",
            department: deptName
          });
        }
      }
    }
  });

  // 2. ดึงข้อมูลการลา
  const allLeaves = [];
  const leaveSheet = ss.getSheetByName(LEAVE_SHEET_NAME);
  if (leaveSheet) {
    const data = leaveSheet.getDataRange().getValues();
    // header: ["วันเวลาที่บันทึก", "ชื่อบุคลากร", "แผนก", "วันที่ลา", "ประเภทการลา"]
    for (let i = 1; i < data.length; i++) {
       const row = data[i];
       const empName = row[1];
       const dateVal = row[3];
       const leaveType = row[4];
       
       if (empName && dateVal) {
          // แปลงวันที่ให้เป็น Format YYYY-MM-DD อย่างปลอดภัย
          let dateStr = "";
          try {
            // สร้าง Date Object (Google Sheets มักจะส่งมาเป็น Date Object อยู่แล้ว)
            const dateObj = new Date(dateVal);
            
            if (!isNaN(dateObj.getTime())) {
                const y = dateObj.getFullYear();
                const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                const d = dateObj.getDate().toString().padStart(2, '0');
                dateStr = `${y}-${m}-${d}`;
            }
          } catch (err) {
            // กรณี parse ไม่ได้ ให้ข้ามไป
          }
          
          if (dateStr) {
             allLeaves.push({
               id: "leave_" + i,
               employeeName: empName,
               date: dateStr,
               type: leaveType
             });
          }
       }
    }
  }

  // ส่งคืนทั้งบุคลากรและการลา
  const result = {
    employees: allEmployees,
    leaves: allLeaves
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * รับข้อมูลจากหน้าเว็บ (POST) - สำหรับบันทึกข้อมูล
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = data.action;

    if (action === "addEmployee") {
      const sheet = ss.getSheetByName(data.department);
      if (sheet) {
        sheet.appendRow([data.name, data.position]);
        return makeResponse("success", "บันทึกบุคลากรเรียบร้อย");
      }
    } 
    
    if (action === "saveLeave") {
      const sheet = ss.getSheetByName(LEAVE_SHEET_NAME);
      if (sheet) {
        data.dates.forEach(date => {
          // date คือ string YYYY-MM-DD จากหน้าเว็บ
          sheet.appendRow([
            new Date(), 
            data.employeeName, 
            data.department, 
            date, 
            data.leaveType
          ]);
        });
        return makeResponse("success", "บันทึกการลาเรียบร้อย");
      }
    }

    if (action === "deleteLeave") {
       // รับคำขอลบ (อนาคตสามารถเพิ่ม logic ลบแถวจริงๆ ได้)
       return makeResponse("success", "รับคำขอลบรายการเรียบร้อย");
    }

    return makeResponse("error", "ไม่พบ Action ที่ต้องการ");
  } catch (err) {
    return makeResponse("error", err.toString());
  }
}

function makeResponse(status, message) {
  return ContentService.createTextOutput(JSON.stringify({ status: status, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
