
let seatData = {
};
function getSeatDataBySeatNo(seatNo) {
    return Object.values(seatData).filter(d => d.desk === seatNo);
}

function bindSeatTooltips() {
    const tooltip = document.getElementById("tooltip");

    document.querySelectorAll(".seat").forEach(seat => {
        const seatNo = seat.dataset.seat;

        seat.onmousemove = (e) => {
            const data = getSeatDataBySeatNo(seatNo);
            if (data?.length === 0) {
                tooltip.innerHTML = `
                    <strong>Seat:</strong> ${seatNo}<br/>
                    <span>Unassigned</span>
                `;
            } else {
                tooltip.innerHTML = `
                    <strong>Seat:</strong> ${seatNo}<br/>
                    ${data.map((emp, i) => `
                        <hr style="margin:6px 0; border-color:#374151"/>
                        <div>
                            <strong>${emp.empName}</strong><br/>
                            <span>Emp ID:</span> ${emp.empId}<br/>
                            <span>Alliance:</span> ${emp.alliance}<br/>
                            <span>Desk Type:</span> ${emp.deskType}<br/>
                            <span>Segment:</span> ${emp.segment}<br/>
                            <span>Shift:</span> ${emp.shift}
                        </div>
                    `).join("")}
                `;
            }
            tooltip.style.left = e.pageX + 14 + "px";
            tooltip.style.top = e.pageY + 14 + "px";
            tooltip.style.display = "block";
        };
        seat.onmouseleave = () => {
            tooltip.style.display = "none";
        };
        // Click → manual edit
        seat.onclick = () => {
            const seatNo = seat.dataset.seat;

            const empId = prompt("Employee ID");
            if (!empId) return;

            const existing = seatData[empId];

            const empName = prompt(
                "Employee Name",
                existing?.empName || ""
            );
            if (empName === null) return;

            const alliance = prompt(
                "Alliance",
                existing?.alliance || ""
            );

            const deskType = prompt(
                "Desk Type (Fixed / Shared)",
                existing?.deskType || "Shared"
            );

            const shift = prompt(
                "Shift",
                existing?.shift || ""
            );

            seatData[empId] = {
                empId,
                empName,
                alliance,
                deskType,
                shift,
                desk: seatNo
            };

            renderSeatTable();
            bindSeatTooltips();
            applySeatColorsByShift();
        };

    });
}
function renderSeatTable() {
    const tbody = document.querySelector("#seatTable tbody");
    tbody.innerHTML = "";

    Object.entries(seatData).forEach(([empId, data]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${data.desk}</td>
            <td>${data.empName}</td>
            <td>${empId}</td>
            <td>${data.alliance}</td>
            <td>${data.deskType}</td>
            <td>${data.segment}</td>
            <td>${data.shift}</td>
        `;
        tbody.appendChild(tr);
    });
}

function applySeatColorsByShift() {
    document.querySelectorAll(".seat").forEach(seat => {
        const seatNo = seat.dataset.seat;
        const data = getSeatDataBySeatNo(seatNo);

        seat.classList.remove("regular", "shared");

        if (!data.length) return;

        // If more than one employee → Shared
        if (data.length > 1) {
            seat.classList.add("shared");
            return;
        }

        // Single employee logic
        const emp = data[0];

        if (emp.deskType === "Fixed") {
            seat.classList.add("regular");
        } else if (emp.deskType === "Shared") {
            seat.classList.add("shared");
        }
    });
}



// json data to seat data
function updateSeatDataFromExcel(jsonData) {
    seatData = {}; // reset old data
    jsonData.forEach(row => {
        if (!row.Desk) return;
        const seatNo = row.Desk.trim().replace(/\s*-\s*/g, "-");
        seatData[row["Emp ID"]] = {
            desk: seatNo || '',
            empName: row.Employee || "",
            empId: row["Emp ID"] || "",
            alliance: row.Alliance || "",
            deskType: row["Desk Type"] || "",
            segment: row.Segment || "",
            shift: row.Shift || ""
        };
    });
    renderSeatTable();
    bindSeatTooltips();
    applySeatColorsByShift();
}
//read file and convert data into json
function uploadExcelToJson(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        // Read workbook
        const workbook = XLSX.read(data, { type: "array" });
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Convert to JSON
        let jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: "", // avoids null/undefined
            raw: true,
        });
        jsonData = jsonData.map((row) => {
            Object.keys(row).forEach((key) => {
                if (key === "__EMPTY") delete row[key];
            });
            return row;
        });
        updateSeatDataFromExcel(jsonData);
    };

    reader.readAsArrayBuffer(file);
}
// upload file
document.getElementById("uploadBtn").onclick = () => {
    document.getElementById("excelUpload").click();
};

// Attach listener
document
    .getElementById("excelUpload")
    .addEventListener("change", function () {
        uploadExcelToJson(this);
    });

function exportSeatDataToExcel() {
    if (!Object.keys(seatData).length) {
        alert("No seat data to export");
        return;
    }

    // Convert seatData object → array
    const exportData = Object.entries(seatData).map(([empId, data]) => ({
        Desk: data.desk,
        Employee: data.empName || "",
        "Emp ID": empId,
        Alliance: data.alliance || "",
        "Desk Type": data.deskType || "",
        Segment: data.segment || "",
        Shift: data.shift || ""
    }));


    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Seat Data");

    // Download file
    XLSX.writeFile(workbook, "Seat_Data_Export.xlsx");
}
document.getElementById("exportBtn").addEventListener("click", exportSeatDataToExcel);

function loadDefaultExcelFromServer(filePath) {
    console.log(filePath);

    fetch(filePath)
        .then(res => {
            if (!res.ok) throw new Error("Excel file not found");
            return res.arrayBuffer();
        })
        .then(buffer => {
            const data = new Uint8Array(buffer);

            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            let jsonData = XLSX.utils.sheet_to_json(worksheet, {
                defval: "",
                raw: true
            });

            jsonData = jsonData.map(row => {
                Object.keys(row).forEach(key => {
                    if (key === "__EMPTY") delete row[key];
                });
                return row;
            });

            updateSeatDataFromExcel(jsonData); // 🔥 reuse existing logic
        })
        .catch(err => {
            console.warn("Default Excel load failed:", err.message);
        });
}
document.addEventListener("DOMContentLoaded", () => {
    loadDefaultExcelFromServer("data/SeatingPlan.xlsx");
});