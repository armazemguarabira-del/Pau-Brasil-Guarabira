import fs from 'fs';
import path from 'path';

const rawData = [
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"JOSE GONCALVES DE SOUZA","Cargo":"Ajudante","Hora Início (HH:MM)":"18:00","Hora Fim (HH:MM)":"01:30","Duração (h)":7.5,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":7.4688,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"CICERO MATHEU DE OLIVEIRA SILVA","Cargo":"Conferente","Hora Início (HH:MM)":"06:30","Hora Fim (HH:MM)":"16:30","Duração (h)":10,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":5.6016,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"DIOGENES PEREIRA DA SILVA","Cargo":"Conferente","Hora Início (HH:MM)":"13:00","Hora Fim (HH:MM)":"22:00","Duração (h)":9,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":6.224,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"GILSON ROSA DA SILVA","Cargo":"Empilhador","Hora Início (HH:MM)":"18:00","Hora Fim (HH:MM)":"01:30","Duração (h)":7.5,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":7.4688,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"NATANAEL LUIZ DA SILVA","Cargo":"Conferente","Hora Início (HH:MM)":"06:30","Hora Fim (HH:MM)":"16:30","Duração (h)":10,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":5.6016,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"KATHYEL ROCHA DA SILVA","Cargo":"Ajudante","Hora Início (HH:MM)":"06:30","Hora Fim (HH:MM)":"16:30","Duração (h)":10,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":5.6016,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"NIXON HENRIQUE PEREIRA DE ARRUDA","Cargo":"Empilhador","Hora Início (HH:MM)":"06:30","Hora Fim (HH:MM)":"16:30","Duração (h)":10,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":5.6016,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"MARIVALDO ARTUR ALVES","Cargo":"Conferente","Hora Início (HH:MM)":"07:00","Hora Fim (HH:MM)":"16:20","Duração (h)":9.33333333333333,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":6.00171428571429,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"JOSE RONILDO DA SILVA","Cargo":"Empilhador","Hora Início (HH:MM)":"07:00","Hora Fim (HH:MM)":"16:20","Duração (h)":9.33333333333333,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":6.00171428571429,"Observações":""},
  {"Data":"2026-01-01","Volume Faturado (HL)":560.16,"Colaborador (ID)":"LUIS ANTONIO FREIRE MOREIRA","Cargo":"Conferente","Hora Início (HH:MM)":"06:30","Hora Fim (HH:MM)":"16:30","Duração (h)":10,"Colaboradores no Dia":10,"PNP - Produtividade Individual (HL/h)":5.6016,"Observações":""}
];

console.log("Count:", rawData.length);
