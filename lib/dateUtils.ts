/**
 * Utilidades de fecha centralizadas para Athletic IA
 * Evita desvíos de zona horaria (UTC vs Local) formateando y operando localmente.
 */

export function formatLocalYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalYYYYMMDD(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  // Se parsea al mediodía local para evitar que desvíos de zona horaria cambien el día
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function getDaysOfWeek(monday: Date): string[] {
  const days: string[] = [];
  const start = new Date(monday);
  start.setHours(12, 0, 0, 0);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(formatLocalYYYYMMDD(d));
  }
  return days;
}

export function getDaysOfMonthGrid(date: Date): string[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Se establece el mediodía para los cálculos intermedios
  const firstDay = new Date(year, month, 1, 12, 0, 0);
  const lastDay = new Date(year, month + 1, 0, 12, 0, 0);

  // Inicio en el lunes de la semana que contiene el primer día del mes
  const firstDayOfWeek = firstDay.getDay();
  const daysToSub = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - daysToSub);

  // Fin en el domingo de la semana que contiene el último día del mes
  const lastDayOfWeek = lastDay.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  const endDate = new Date(lastDay);
  endDate.setDate(lastDay.getDate() + daysToAdd);

  const days: string[] = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    days.push(formatLocalYYYYMMDD(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return days;
}
