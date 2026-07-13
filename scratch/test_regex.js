const text = "¡Excelente, [MÍSTER]! Es fundamental desglosar las tareas por líneas...";
const regex = /\[([A-Z]{2,4})\]/g;
let match;
while ((match = regex.exec(text)) !== null) {
  console.log("Match:", match[0], "Group 1:", match[1]);
}
