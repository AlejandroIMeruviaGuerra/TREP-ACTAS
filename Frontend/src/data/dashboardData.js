export const dashboardStats = [
  {
    title: "Actas TREP",
    value: "1,245",
    detail: "Actas rápidas registradas",
  },
  {
    title: "Actas Oficiales",
    value: "1,120",
    detail: "Actas verificadas oficialmente",
  },
  {
    title: "Actas con error",
    value: "38",
    detail: "Errores o duplicados detectados",
  },
  {
    title: "Participación",
    value: "72.5%",
    detail: "Promedio nacional simulado",
  },
];

export const partyResults = [
  { party: "Partido 1", votes: 245000 },
  { party: "Partido 2", votes: 198500 },
  { party: "Partido 3", votes: 154300 },
  { party: "Partido 4", votes: 89000 },
  { party: "Blancos", votes: 22500 },
  { party: "Nulos", votes: 18500 },
];

export const departmentResults = [
  { department: "La Paz", trep: 185000, oficial: 181500 },
  { department: "Cochabamba", trep: 142000, oficial: 139800 },
  { department: "Santa Cruz", trep: 210000, oficial: 207200 },
  { department: "Chuquisaca", trep: 62000, oficial: 60100 },
  { department: "Oruro", trep: 57000, oficial: 55200 },
];

export const logsPreview = [
  {
    id: 1,
    source: "SMS",
    type: "Formato inválido",
    detail: "Falta campo P3 en mensaje recibido",
  },
  {
    id: 2,
    source: "OCR",
    type: "Lectura fallida",
    detail: "No se pudo reconocer código de mesa",
  },
  {
    id: 3,
    source: "TREP",
    type: "Duplicado",
    detail: "La mesa 10101001001 ya fue registrada",
  },
];