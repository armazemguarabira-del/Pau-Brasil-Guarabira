import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';

const DEFAULT_CONFIG = {
  apiKey: "AIzaSyCZ2yYeYPVA_TVIEwsvQNJ9tzq4f3kYyis",
  authDomain: "armazemrelatorios.firebaseapp.com",
  projectId: "armazemrelatorios",
  storageBucket: "armazemrelatorios.firebasestorage.app",
  messagingSenderId: "1060201893094",
  appId: "1:1060201893094:web:5702ee694b6e234f0dbf27"
};

const app = initializeApp(DEFAULT_CONFIG);
const db = getFirestore(app);

// Data structure: [ID, SKU, Descrição, Qtd, Conferente, Operador, Status, Criado, Iniciado, Finalizado, Duração, Tipo]
const rawTasksBatch1: any[] = [
  [205, 1743, "ANTARCTICA PILSEN GFA VD 1L COM TTC", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "26/05/2026, 08:45:25", "26/05/2026, 08:51:09", "26/05/2026, 08:52:16", "1.1", "Após o Carregamento"],
  [128, 13061, "H2OH LIMONETO PET 500ML SHRINK C/12 NPAL", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "21/05/2026, 10:31:48", "21/05/2026, 16:19:10", "21/05/2026, 16:20:38", "1.5", "Após o Carregamento"],
  [835, 2319, "GUARANA CHP ANTARCTICA PET 1L CAIXA C/12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "20/06/2026, 21:53:44", "20/06/2026, 22:05:48", "20/06/2026, 22:05:50", "—", "Durante o Carregamento"],
  [652, 9068, "SKOL LATA 350ML SH C/12 NPAL", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "11/06/2026, 07:45:25", "11/06/2026, 08:13:29", "11/06/2026, 08:17:45", "4.3", "Após o Carregamento"],
  [878, 17808, "BUDWEISER OW 330ML CX C/24", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "23/06/2026, 03:10:03", "23/06/2026, 03:10:49", "23/06/2026, 03:11:02", "0.2", "Durante o Carregamento"],
  [260, 9084, "GUARANA CHP ANTARCTICA LATA 350ML SH C/12 NPA", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "27/05/2026, 10:01:49", "27/05/2026, 10:44:46", "27/05/2026, 10:46:06", "1.3", "Após o Carregamento"],
  [120, 7945, "PEPSI COLA PET 2,5L CAIXA C/6", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "21/05/2026, 10:29:01", "21/05/2026, 15:25:13", "21/05/2026, 15:26:03", "0.8", "Após o Carregamento"],
  [970, 20164, "SKOL LT 473ML SH C/12 NPAL MULTPACK 12", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "30/06/2026, 10:09:20", "30/06/2026, 10:45:34", "30/06/2026, 10:46:38", "1.1", "Após o Carregamento"],
  [810, 9068, "SKOL LATA 350ML SH C/12 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "19/06/2026, 06:12:31", "19/06/2026, 06:18:12", "19/06/2026, 06:18:47", "0.6", "Durante o Carregamento"],
  [241, 34479, "ELEVE AGUA MIN S GAS PET 1,5 SHRINK C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "27/05/2026, 04:39:12", "27/05/2026, 04:40:41", "27/05/2026, 04:41:00", "0.3", "Durante o Carregamento"],
  [629, 13203, "ANTARCTICA PILSEN GFA VD 300ML CX C/23", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "10/06/2026, 14:24:55", "10/06/2026, 14:53:39", "10/06/2026, 14:54:35", "0.9", "Após o Carregamento"],
  [740, 504, "PEPSI COLA PET 2L CAIXA C/6", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "15/06/2026, 14:25:57", "15/06/2026, 17:02:47", "15/06/2026, 17:04:50", "2", "Após o Carregamento"],
  [630, 20217, "ORIGINAL GFA VD 300ML CX C/23", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "10/06/2026, 14:25:03", "10/06/2026, 14:54:50", "10/06/2026, 14:55:15", "0.4", "Após o Carregamento"],
  [449, 17808, "BUDWEISER OW 330ML CX C/24", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "03/06/2026, 14:58:11", "03/06/2026, 16:11:12", "03/06/2026, 16:12:21", "1.2", "Após o Carregamento"],
  [978, 13196, "SKOL ONE WAY 300ML CX C/23", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "30/06/2026, 10:56:12", "30/06/2026, 15:25:57", "30/06/2026, 15:27:30", "1.5", "Após o Carregamento"],
  [509, 2546, "ORIGINAL 600ML", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "04/06/2026, 14:18:04", "04/06/2026, 16:14:54", "04/06/2026, 16:15:57", "1.1", "Após o Carregamento"],
  [10039, 34608, "SKOL LATA 350ML SH C/12 NPAL MULTIPACK", 2, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "14/07/2026, 14:30:07", "14/07/2026, 15:06:32", "14/07/2026, 15:09:11", "2.6", "Após o Carregamento"],
  [62, 9320, "BRAHMA CHOPP LT 473ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "19/05/2026, 10:30:12", "19/05/2026, 15:16:02", "19/05/2026, 15:17:55", "1.9", "Após o Carregamento"],
  [815, 1745, "SKOL LT 269ML SH C15 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "20/06/2026, 03:49:11", "20/06/2026, 03:58:38", "20/06/2026, 03:58:56", "0.3", "Durante o Carregamento"],
  [906, 34027, "GUARANA CHP ANTARCTICA LATA 350ML SH C/12 NPAL MULTIPACK", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "26/06/2026, 06:09:34", "26/06/2026, 06:09:39", "26/06/2026, 06:10:09", "0.5", "Durante o Carregamento"],
  [24629, 19164, "GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPACK", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "17/07/2026, 08:40:43", "17/07/2026, 10:33:20", "17/07/2026, 10:34:15", "0.9", "Após o Carregamento"],
  [114, 2546, "ORIGINAL 600ML", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "21/05/2026, 10:27:37", "21/05/2026, 14:52:04", "21/05/2026, 14:54:04", "2", "Após o Carregamento"],
  [9982, 2546, "ORIGINAL 600ML", 2, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "08/07/2026, 01:15:37", "08/07/2026, 01:18:54", "08/07/2026, 01:19:15", "0.4", "Durante o Carregamento"],
  [526, 21020, "BUDWEISER LT SLEEK 350ML CX CART C 12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "05/06/2026, 04:32:59", "05/06/2026, 04:36:47", "05/06/2026, 04:37:31", "0.7", "Durante o Carregamento"],
  [1038, 1388, "SKOL GFA VD 1L 2,99", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "02/07/2026, 10:50:29", "02/07/2026, 11:03:21", "02/07/2026, 11:06:26", "3.1", "Após o Carregamento"],
  [937, 9068, "SKOL LATA 350ML SH C/12 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "30/06/2026, 01:44:56", "30/06/2026, 01:45:36", "30/06/2026, 01:45:46", "0.2", "Durante o Carregamento"],
  [10073, 20217, "ORIGINAL GFA VD 300ML CX C/23", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "15/07/2026, 09:35:08", "15/07/2026, 10:36:49", "15/07/2026, 10:36:55", "0.1", "Após o Carregamento"],
  [10006, 1743, "ANTARCTICA PILSEN GFA VD 1L COM TTC", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "10/07/2026, 02:52:29", "10/07/2026, 02:52:46", "10/07/2026, 02:52:57", "0.2", "Durante o Carregamento"],
  [361, 34608, "SKOL LATA 350ML SH C/12 NPAL MULTIPACK", 6, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "01/06/2026, 14:43:36", "01/06/2026, 15:01:41", "01/06/2026, 15:08:29", "6.8", "Após o Carregamento"],
  [10075, 2548, "BUDWEISER 600ML", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "15/07/2026, 09:35:25", "15/07/2026, 10:45:42", "15/07/2026, 10:50:16", "4.6", "Após o Carregamento"],
  [902, 7325, "PEPSI COLA PET 1L CAIXA C/12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "26/06/2026, 04:55:43", "26/06/2026, 05:04:00", "26/06/2026, 05:04:33", "0.5", "Durante o Carregamento"],
  [10019, 2538, "ANTARCTICA PILSEN 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "10/07/2026, 06:01:48", "10/07/2026, 06:13:16", "10/07/2026, 06:13:17", "—", "Durante o Carregamento"],
  [9978, 2546, "ORIGINAL 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "07/07/2026, 21:49:48", "07/07/2026, 21:51:43", "07/07/2026, 21:51:46", "0.1", "Durante o Carregamento"],
  [357, 982, "SKOL 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "30/05/2026, 03:52:21", "30/05/2026, 04:06:52", "30/05/2026, 04:07:40", "0.8", "Durante o Carregamento"],
  [1015, 20651, "CORONA EXTRA N LT SLEEK 350ML C 8 CX CARTAO", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "01/07/2026, 10:57:31", "02/07/2026, 08:19:56", "02/07/2026, 08:19:58", "—", "Após o Carregamento"],
  [758, 34475, "ELEVE AGUA MIN S GAS GFA PET 510ML FD C/12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "16/06/2026, 06:05:06", "16/06/2026, 06:05:31", "16/06/2026, 06:06:13", "0.7", "Durante o Carregamento"],
  [1074, 19164, "GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPACK", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "07/07/2026, 01:42:51", "07/07/2026, 04:01:20", "07/07/2026, 04:01:33", "0.2", "Durante o Carregamento"],
  [24640, 33820, "BRAHMA CHOPP LT 350ML SH C/12 NP MULTIPK", 2, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "17/07/2026, 10:24:08", "17/07/2026, 15:27:49", "17/07/2026, 15:30:54", "3.1", "Após o Carregamento"],
  [1060, 21632, "SPATEN N LN 355ML SIXPACK SH C/4", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "03/07/2026, 03:10:08", "03/07/2026, 03:12:07", "03/07/2026, 03:12:32", "0.4", "Durante o Carregamento"],
  [944, 13205, "SKOL GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "30/06/2026, 04:52:46", "30/06/2026, 04:57:41", "30/06/2026, 04:57:53", "0.2", "Durante o Carregamento"],
  [1071, 37450, "BUDWEISER LT SLEEK 350ML SH C 12 MULTIPACK", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "05/07/2026, 09:56:47", "05/07/2026, 09:58:08", "05/07/2026, 09:58:16", "0.1", "Durante o Carregamento"],
  [547, 18836, "CORONA EXTRA N LONG NECK 330ML CX C/24 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "05/06/2026, 21:20:13", "05/06/2026, 21:21:38", "05/06/2026, 21:22:16", "0.6", "Durante o Carregamento"],
  [158, 9084, "GUARANA CHP ANTARCTICA LATA 350ML SH C/12 NPA", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "22/05/2026, 14:37:24", "22/05/2026, 15:49:48", "22/05/2026, 15:51:11", "1.4", "Após o Carregamento"],
  [10059, 2546, "ORIGINAL 600ML", 2, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "15/07/2026, 01:19:13", "15/07/2026, 01:20:39", "15/07/2026, 01:20:58", "0.3", "Durante o Carregamento"],
  [437, 13205, "SKOL GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "03/06/2026, 04:28:35", "03/06/2026, 04:34:44", "03/06/2026, 04:35:23", "0.7", "Durante o Carregamento"],
  [10024, 503, "SUKITA PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "10/07/2026, 21:48:50", "10/07/2026, 21:51:40", "10/07/2026, 21:51:55", "0.3", "Durante o Carregamento"],
  [333, 17808, "BUDWEISER OW 330ML CX C/24", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "29/05/2026, 14:57:11", "29/05/2026, 15:04:53", "29/05/2026, 15:05:52", "1", "Após o Carregamento"],
  [589, 35331, "BUDWEISER GFA VD 1L", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "08/06/2026, 15:19:22", "08/06/2026, 16:41:02", "08/06/2026, 16:44:00", "3", "Após o Carregamento"],
  [870, 2349, "GUARANA CHP ANTARCTICA PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "23/06/2026, 01:46:56", "23/06/2026, 01:47:58", "23/06/2026, 01:48:20", "0.4", "Durante o Carregamento"],
  [374, 9084, "GUARANA CHP ANTARCTICA LATA 350ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "01/06/2026, 14:52:06", "01/06/2026, 17:14:24", "01/06/2026, 17:15:38", "1.2", "Após o Carregamento"],
  [805, 12948, "BRAHMA CHOPP ZERO LATA 350ML SH C/12 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "19/06/2026, 04:16:17", "19/06/2026, 04:18:28", "19/06/2026, 04:18:43", "0.3", "Durante o Carregamento"],
  [10048, 2548, "BUDWEISER 600ML", 2, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "14/07/2026, 14:32:45", "14/07/2026, 16:20:25", "14/07/2026, 16:24:09", "3.7", "Após o Carregamento"],
  [787, 2548, "BUDWEISER 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "18/06/2026, 03:45:47", "18/06/2026, 03:50:20", "18/06/2026, 03:50:37", "0.3", "Durante o Carregamento"],
  [228, 13065, "H2OH LIMONETO PET 1,5 SHRINK C/06 NPAL", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "26/05/2026, 14:19:59", "26/05/2026, 15:31:31", "26/05/2026, 15:32:55", "1.4", "Após o Carregamento"],
  [37, 20530, "STELLA ARTOIS 600 ML", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "18/05/2026, 17:31:21", "18/05/2026, 17:32:14", "18/05/2026, 17:33:33", "1.3", "Após o Carregamento"],
  [279, 2538, "ANTARCTICA PILSEN 600ML", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "28/05/2026, 14:13:42", "28/05/2026, 15:24:09", "28/05/2026, 15:28:21", "4.2", "Após o Carregamento"],
  [303, 2548, "BUDWEISER 600ML", 4, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "28/05/2026, 15:44:48", "28/05/2026, 15:46:30", "28/05/2026, 15:49:17", "2.8", "Após o Carregamento"],
  [197, 9069, "BRAHMA CHOPP LATA 350ML SH C/12 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "25/05/2026, 22:29:36", "25/05/2026, 22:32:00", "25/05/2026, 22:34:15", "2.2", "Durante o Carregamento"],
  [1059, 32526, "PETROPOLIS AGUA MIN SEM GAS GARRAFA PET 500MLCX C12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "03/07/2026, 03:09:57", "03/07/2026, 03:10:18", "03/07/2026, 03:10:43", "0.4", "Durante o Carregamento"],
  [24588, 9067, "ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL", 2, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "16/07/2026, 14:27:01", "16/07/2026, 14:36:55", "16/07/2026, 14:38:38", "1.7", "Após o Carregamento"],
  [126, 21668, "SPATEN N ONE WAY 600ML CX C/12 NP ARTE", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "21/05/2026, 10:31:22", "21/05/2026, 16:03:37", "21/05/2026, 16:05:16", "1.7", "Após o Carregamento"],
  [476, 13201, "BRAHMA CHOPP GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "04/06/2026, 04:01:04", "04/06/2026, 04:01:31", "04/06/2026, 04:02:11", "0.7", "Durante o Carregamento"],
  [24592, 35331, "BUDWEISER GFA VD 1L", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "16/07/2026, 14:41:12", "16/07/2026, 15:17:12", "16/07/2026, 15:18:20", "1.1", "Após o Carregamento"],
  [156, 34608, "SKOL LATA 350ML SH C/12 NPAL MULTIPACK", 2, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "22/05/2026, 14:35:01", "22/05/2026, 15:56:00", "22/05/2026, 15:58:37", "2.6", "Após o Carregamento"],
  [1034, 33820, "BRAHMA CHOPP LT 350ML SH C/12 NP MULTIPK", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "02/07/2026, 08:21:58", "02/07/2026, 10:42:00", "02/07/2026, 10:43:07", "1.1", "Após o Carregamento"],
  [651, 34608, "SKOL LATA 350ML SH C/12 NPAL MULTIPACK", 5, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "11/06/2026, 07:45:08", "11/06/2026, 08:00:55", "11/06/2026, 08:07:06", "6.2", "Após o Carregamento"],
  [1000, 9084, "GUARANA CHP ANTARCTICA LATA 350ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "01/07/2026, 09:17:51", "01/07/2026, 10:16:58", "01/07/2026, 10:18:09", "1.2", "Após o Carregamento"],
  [836, 2319, "GUARANA CHP ANTARCTICA PET 1L CAIXA C/12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "20/06/2026, 21:53:55", "20/06/2026, 22:03:56", "20/06/2026, 22:05:46", "1.8", "Durante o Carregamento"],
  [932, 13061, "H2OH LIMONETO PET 500ML SHRINK C/12 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "30/06/2026, 01:18:50", "30/06/2026, 01:25:09", "30/06/2026, 01:25:27", "0.3", "Durante o Carregamento"],
  [673, 2353, "GUARANA CHP ANTARCTICA DIET PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "12/06/2026, 04:20:38", "12/06/2026, 04:20:49", "12/06/2026, 04:21:10", "0.4", "Durante o Carregamento"],
  [404, 34608, "SKOL LATA 350ML SH C/12 NPAL MULTIPACK", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "02/06/2026, 14:59:04", "02/06/2026, 15:20:36", "02/06/2026, 15:21:30", "0.9", "Após o Carregamento"],
  [427, 1743, "ANTARCTICA PILSEN GFA VD 1L COM TTC", 2, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "02/06/2026, 16:30:32", "02/06/2026, 16:54:20", "02/06/2026, 16:56:23", "2.1", "Após o Carregamento"],
  [558, 2546, "ORIGINAL 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "06/06/2026, 04:53:12", "06/06/2026, 04:55:33", "06/06/2026, 04:56:07", "0.6", "Durante o Carregamento"],
  [567, 33820, "BRAHMA CHOPP LT 350ML SH C/12 NP MULTIPK", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "08/06/2026, 14:59:06", "08/06/2026, 15:44:33", "08/06/2026, 15:45:57", "1.4", "Após o Carregamento"],
  [683, 9068, "SKOL LATA 350ML SH C/12 NPAL", 2, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "12/06/2026, 14:41:24", "12/06/2026, 14:57:54", "12/06/2026, 15:00:31", "2.6", "Após o Carregamento"],
  [329, 13205, "SKOL GFA VD 300ML CX C/23", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "29/05/2026, 09:55:06", "29/05/2026, 10:10:36", "29/05/2026, 10:14:03", "3.5", "Após o Carregamento"],
  [370, 13201, "BRAHMA CHOPP GFA VD 300ML CX C/23", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "01/06/2026, 14:50:50", "01/06/2026, 15:49:26", "01/06/2026, 15:50:36", "1.2", "Após o Carregamento"],
  [10034, 9276, "PEPSI ZERO PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "14/07/2026, 03:48:31", "14/07/2026, 05:19:56", "14/07/2026, 05:20:02", "0.1", "Durante o Carregamento"],
  [393, 13201, "BRAHMA CHOPP GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "01/06/2026, 23:24:12", "01/06/2026, 23:31:29", "01/06/2026, 23:31:47", "0.3", "Durante o Carregamento"],
  [751, 2546, "ORIGINAL 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "16/06/2026, 02:54:40", "16/06/2026, 02:56:11", "16/06/2026, 02:56:24", "0.2", "Durante o Carregamento"],
  [542, 9067, "ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL", 5, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "05/06/2026, 14:38:49", "05/06/2026, 17:59:36", "05/06/2026, 18:04:55", "5.3", "Após o Carregamento"],
  [10105, 9084, "GUARANA CHP ANTARCTICA LATA 350ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "15/07/2026, 17:34:16", "15/07/2026, 17:37:31", "15/07/2026, 17:39:01", "1.5", "Após o Carregamento"],
  [105, 1743, "ANTARCTICA PILSEN GFA VD 1L COM TTC", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "21/05/2026, 10:25:59", "21/05/2026, 11:31:02", "21/05/2026, 11:34:57", "3.9", "Após o Carregamento"],
  [934, 2349, "GUARANA CHP ANTARCTICA PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "30/06/2026, 01:20:47", "30/06/2026, 01:27:08", "30/06/2026, 01:28:04", "0.9", "Durante o Carregamento"],
  [294, 12948, "BRAHMA CHOPP ZERO LATA 350ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "28/05/2026, 14:19:03", "28/05/2026, 16:26:49", "28/05/2026, 16:28:00", "1.2", "Após o Carregamento"],
  [432, 2546, "ORIGINAL 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "03/06/2026, 01:30:31", "03/06/2026, 01:31:20", "03/06/2026, 03:05:32", "94.2", "Durante o Carregamento"],
  [24, 34608, "SKOL LATA 350ML SH C/12 NPAL MULTIPACK", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "18/05/2026, 14:45:29", "18/05/2026, 15:40:06", "18/05/2026, 15:41:24", "1.3", "Após o Carregamento"],
  [903, 13201, "BRAHMA CHOPP GFA VD 300ML CX C/23", 2, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "26/06/2026, 06:08:49", "26/06/2026, 06:08:50", "26/06/2026, 06:09:04", "0.2", "Durante o Carregamento"],
  [273, 1695, "BRAHMA CHOPP GFA VD 1L COM TTC", 2, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "28/05/2026, 14:11:58", "28/05/2026, 14:42:14", "28/05/2026, 14:44:37", "2.4", "Após o Carregamento"],
  [537, 982, "SKOL 600ML", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "05/06/2026, 14:27:43", "05/06/2026, 15:26:34", "05/06/2026, 15:31:51", "5.3", "Após o Carregamento"],
  [532, 1743, "ANTARCTICA PILSEN GFA VD 1L COM TTC", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "05/06/2026, 14:26:38", "05/06/2026, 14:57:00", "05/06/2026, 14:59:36", "2.6", "Após o Carregamento"],
  [291, 13065, "H2OH LIMONETO PET 1,5 SHRINK C/06 NPAL", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "28/05/2026, 14:17:22", "28/05/2026, 16:45:41", "28/05/2026, 16:46:54", "1.2", "Após o Carregamento"],
  [603, 503, "SUKITA PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "10/06/2026, 03:14:29", "10/06/2026, 03:14:31", "10/06/2026, 03:14:50", "0.3", "Durante o Carregamento"],
  [1078, 2546, "ORIGINAL 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "07/07/2026, 04:20:18", "07/07/2026, 05:44:32", "07/07/2026, 05:44:41", "0.2", "Durante o Carregamento"],
  [1047, 19164, "GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPACK", 2, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "02/07/2026, 10:53:37", "02/07/2026, 15:08:22", "02/07/2026, 15:08:26", "0.1", "Após o Carregamento"],
  [31, 2548, "BUDWEISER 600ML", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "18/05/2026, 15:51:19", "18/05/2026, 15:52:09", "18/05/2026, 15:55:24", "3.3", "Após o Carregamento"],
  [24591, 33820, "BRAHMA CHOPP LT 350ML SH C/12 NP MULTIPK", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "16/07/2026, 14:36:11", "16/07/2026, 14:47:28", "16/07/2026, 14:50:41", "3.2", "Após o Carregamento"],
  [3508, 15302, "BRAHMA DUPLO MALTE LATA 350ML", 4, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "06/07/2026, 14:09:45", "06/07/2026, 14:21:45", "06/07/2026, 14:33:45", "12", "Durante o Carregamento"],
  [931, 23546, "INDAIA AGUA MINERAL C/GAS GFA PET 500ML PACK C/12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "29/06/2026, 23:49:33", "29/06/2026, 23:49:36", "29/06/2026, 23:49:43", "0.1", "Durante o Carregamento"],
  [407, 9069, "BRAHMA CHOPP LATA 350ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "02/06/2026, 14:59:40", "02/06/2026, 15:51:26", "02/06/2026, 15:52:29", "1.1", "Após o Carregamento"],
  [82, 13205, "SKOL GFA VD 300ML CX C/23", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "20/05/2026, 15:30:20", "20/05/2026, 16:01:17", "20/05/2026, 16:04:10", "2.9", "Após o Carregamento"],
  [24648, 13065, "H2OH LIMONETO PET 1,5 SHRINK C/06 NPAL", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "17/07/2026, 10:31:16", "17/07/2026, 16:09:08", "17/07/2026, 16:10:29", "1.3", "Após o Carregamento"],
  [789, 13205, "SKOL GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "18/06/2026, 04:52:55", "18/06/2026, 04:54:10", "18/06/2026, 04:55:01", "0.9", "Durante o Carregamento"],
  [926, 19321, "GUARANA ANTARCTICA ZERO PET 200ML SH C/12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "29/06/2026, 23:48:01", "29/06/2026, 23:48:12", "29/06/2026, 23:48:28", "0.3", "Durante o Carregamento"],
  [764, 9068, "SKOL LATA 350ML SH C/12 NPAL", 2, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "16/06/2026, 09:58:33", "16/06/2026, 11:44:19", "16/06/2026, 11:47:22", "3", "Após o Carregamento"],
  [473, 1166, "SUKITA UVA PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "04/06/2026, 02:12:14", "04/06/2026, 02:12:49", "04/06/2026, 02:13:25", "0.6", "Durante o Carregamento"],
  [214, 19164, "GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPA", 2, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "26/05/2026, 08:47:38", "26/05/2026, 10:00:40", "26/05/2026, 10:03:11", "2.5", "Após o Carregamento"],
  [24610, 13566, "SKOL BEATS SENSES LT 269ML CX C/8 FRIDGE PACK", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "16/07/2026, 14:50:30", "16/07/2026, 16:44:52", "16/07/2026, 16:46:18", "1.4", "Após o Carregamento"],
  [280, 2546, "ORIGINAL 600ML", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "28/05/2026, 14:13:52", "28/05/2026, 15:36:22", "28/05/2026, 15:37:11", "0.8", "Após o Carregamento"],
  [778, 13205, "SKOL GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "17/06/2026, 05:22:51", "17/06/2026, 05:26:00", "17/06/2026, 05:26:32", "0.5", "Durante o Carregamento"],
  [10046, 19729, "STELLA ARTOIS LT SLEEK 350ML C 8 CX CARTAO", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "14/07/2026, 14:32:19", "14/07/2026, 15:52:01", "14/07/2026, 15:53:01", "1", "Após o Carregamento"],
  [503, 19164, "GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPACK", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "04/06/2026, 14:16:12", "04/06/2026, 16:50:58", "04/06/2026, 16:51:38", "0.7", "Após o Carregamento"],
  [133, 7982, "GATORADE LIMAO PET 500ML SIXPACK", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "21/05/2026, 16:50:05", "21/05/2026, 16:54:05", "21/05/2026, 16:54:31", "0.4", "Após o Carregamento"],
  [573, 17808, "BUDWEISER OW 330ML CX C/24", 2, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "08/06/2026, 15:14:42", "08/06/2026, 17:22:54", "08/06/2026, 17:23:31", "0.6", "Após o Carregamento"],
  [671, 32528, "PETROPOLIS AGUA MIN COM GAS GARRAFA PET 500MLCX C12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "12/06/2026, 04:20:00", "12/06/2026, 04:20:20", "12/06/2026, 04:20:42", "0.4", "Durante o Carregamento"],
  [268, 2353, "GUARANA CHP ANTARCTICA DIET PET 2L CAIXA C/6", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "27/05/2026, 15:24:31", "27/05/2026, 15:48:48", "27/05/2026, 15:49:51", "1.1", "Após o Carregamento"],
  [243, 1743, "ANTARCTICA PILSEN GFA VD 1L COM TTC", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "27/05/2026, 08:01:27", "27/05/2026, 08:17:46", "27/05/2026, 08:22:28", "4.7", "Após o Carregamento"],
  [613, 13205, "SKOL GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "10/06/2026, 05:52:23", "10/06/2026, 05:53:09", "10/06/2026, 05:56:03", "2.9", "Durante o Carregamento"],
  [994, 34475, "ELEVE AGUA MIN S GAS GFA PET 510ML FD C/12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "01/07/2026, 06:15:50", "01/07/2026, 06:26:32", "01/07/2026, 06:26:51", "0.3", "Durante o Carregamento"],
  [422, 504, "PEPSI COLA PET 2L CAIXA C/6", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "02/06/2026, 16:27:58", "02/06/2026, 17:29:31", "02/06/2026, 17:30:57", "1.4", "Após o Carregamento"],
  [482, 9067, "ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL", 4, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "04/06/2026, 14:10:19", "04/06/2026, 15:08:17", "04/06/2026, 15:11:43", "3.4", "Após o Carregamento"],
  [569, 19229, "RED BULL BR LATA 250ML SIX PACK NPAL", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "08/06/2026, 15:11:25", "08/06/2026, 17:24:06", "08/06/2026, 17:25:07", "1", "Após o Carregamento"],
  [24603, 504, "PEPSI COLA PET 2L CAIXA C/6", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "16/07/2026, 14:43:38", "16/07/2026, 16:07:56", "16/07/2026, 16:09:14", "1.3", "Após o Carregamento"],
  [358, 34608, "SKOL LATA 350ML SH C/12 NPAL MULTIPACK", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "30/05/2026, 04:46:06", "30/05/2026, 04:46:38", "30/05/2026, 04:47:03", "0.4", "Durante o Carregamento"],
  [485, 20164, "SKOL LT 473ML SH C/12 NPAL MULTPACK 12", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "04/06/2026, 14:11:12", "04/06/2026, 15:20:54", "04/06/2026, 15:22:17", "1.4", "Após o Carregamento"],
  [65, 9083, "SKOL LT 473ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "19/05/2026, 10:31:38", "19/05/2026, 15:45:09", "19/05/2026, 15:46:49", "1.7", "Após o Carregamento"],
  [743, 9795, "GUARANA ANTARCTICA ZERO PET 1L CAIXA C/12", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "15/06/2026, 14:27:21", "15/06/2026, 17:07:50", "15/06/2026, 17:08:42", "0.9", "Após o Carregamento"],
  [680, 2548, "BUDWEISER 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "12/06/2026, 06:54:58", "12/06/2026, 06:55:13", "12/06/2026, 06:55:23", "0.2", "Durante o Carregamento"],
  [2041, 12040, "ANTARCTICA ORIGINAL GF 600ML", 8, "MATHEUS", "RONILDO", "CONCLUÍDO", "06/07/2026, 14:39:45", "06/07/2026, 14:51:45", "06/07/2026, 15:09:45", "18", "Após o Carregamento"],
  [597, 19164, "GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPACK", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "09/06/2026, 05:20:06", "09/06/2026, 05:20:25", "09/06/2026, 05:21:05", "0.7", "Durante o Carregamento"],
  [591, 20217, "ORIGINAL GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "09/06/2026, 02:14:01", "09/06/2026, 02:18:12", "09/06/2026, 02:18:32", "0.3", "Durante o Carregamento"],
  [202, 13205, "SKOL GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "26/05/2026, 04:08:15", "26/05/2026, 04:09:08", "26/05/2026, 04:10:10", "1", "Durante o Carregamento"],
  [286, 24256, "PETROPOLIS AGUA MIN SEM GAS PET 1,5 SHRINK C/", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "28/05/2026, 14:15:56", "28/05/2026, 16:54:49", "28/05/2026, 16:55:43", "0.9", "Após o Carregamento"],
  [24596, 13205, "SKOL GFA VD 300ML CX C/23", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "16/07/2026, 14:42:09", "16/07/2026, 15:34:30", "16/07/2026, 15:38:13", "3.7", "Após o Carregamento"],
  [10083, 29845, "PEPSI BLACK PET 1 L SH C/12", 1, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "15/07/2026, 09:36:36", "15/07/2026, 11:42:32", "15/07/2026, 11:42:36", "0.1", "Após o Carregamento"],
  [725, 20164, "SKOL LT 473ML SH C/12 NPAL MULTPACK 12", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "15/06/2026, 14:22:17", "15/06/2026, 15:00:47", "15/06/2026, 15:02:02", "1.3", "Após o Carregamento"],
  [792, 504, "PEPSI COLA PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "18/06/2026, 04:55:18", "18/06/2026, 04:55:27", "18/06/2026, 04:55:45", "0.3", "Durante o Carregamento"],
  [669, 20164, "SKOL LT 473ML SH C/12 NPAL MULTPACK 12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "12/06/2026, 02:33:52", "12/06/2026, 02:59:24", "12/06/2026, 02:59:50", "0.4", "Durante o Carregamento"],
  [24593, 1388, "SKOL GFA VD 1L 2,99", 2, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "16/07/2026, 14:41:23", "16/07/2026, 15:19:32", "16/07/2026, 15:20:33", "1", "Após o Carregamento"],
  [7, 988, "BRAHMA CHOPP 600ML", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "18/05/2026, 14:21:13", "18/05/2026, 15:26:22", "18/05/2026, 15:30:01", "3.6", "Após o Carregamento"],
  [320, 9068, "SKOL LATA 350ML SH C/12 NPAL", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "29/05/2026, 08:24:07", "29/05/2026, 08:39:02", "29/05/2026, 08:41:28", "2.4", "Após o Carregamento"],
  [500, 34475, "ELEVE AGUA MIN S GAS GFA PET 510ML FD C/12", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "04/06/2026, 14:15:40", "04/06/2026, 17:27:58", "04/06/2026, 17:29:10", "1.2", "Após o Carregamento"],
  [347, 9081, "MALZBIER BRAHMA LATA 350ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "29/05/2026, 17:10:15", "29/05/2026, 17:54:05", "29/05/2026, 17:55:05", "1", "Após o Carregamento"],
  [842, 19164, "GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPACK", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "20/06/2026, 23:04:30", "20/06/2026, 23:08:20", "20/06/2026, 23:08:33", "0.2", "Durante o Carregamento"],
  [254, 9067, "ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL", 3, "GILSON ROSA DA SILVA", "MARIVALDO ARTHUR", "CONCLUÍDO", "27/05/2026, 09:59:28", "27/05/2026, 10:06:04", "27/05/2026, 10:10:15", "4.2", "Após o Carregamento"],
  [348, 347, "SUKITA PET 1L CAIXA C/12", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "29/05/2026, 17:10:29", "29/05/2026, 17:56:57", "29/05/2026, 17:57:43", "0.8", "Após o Carregamento"],
  [9, 504, "PEPSI COLA PET 2L CAIXA C/6", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "18/05/2026, 14:38:56", "18/05/2026, 16:40:20", "18/05/2026, 16:41:42", "1.4", "Após o Carregamento"],
  [189, 23546, "INDAIA AGUA MINERAL C/GAS GFA PET 500ML PACK", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "25/05/2026, 15:48:26", "25/05/2026, 16:25:56", "25/05/2026, 16:27:24", "1.5", "Após o Carregamento"],
  [24616, 13201, "BRAHMA CHOPP GFA VD 300ML CX C/23", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "17/07/2026, 05:16:55", "17/07/2026, 05:21:10", "17/07/2026, 05:21:11", "—", "Durante o Carregamento"],
  [397, 2546, "ORIGINAL 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "02/06/2026, 02:49:47", "02/06/2026, 02:51:44", "02/06/2026, 02:52:11", "0.5", "Durante o Carregamento"],
  [506, 7947, "GUARANA CHP ANTARCTICA PET 2,5L CAIXA C/6", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "04/06/2026, 14:16:40", "04/06/2026, 17:08:15", "04/06/2026, 17:09:27", "1.2", "Após o Carregamento"],
  [203, 20530, "STELLA ARTOIS 600 ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "26/05/2026, 04:09:48", "26/05/2026, 04:14:39", "26/05/2026, 04:14:43", "0.1", "Durante o Carregamento"],
  [719, 4409, "PEPSI TWIST PET 2L SHRINK C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "13/06/2026, 05:25:54", "13/06/2026, 05:30:17", "13/06/2026, 05:30:56", "0.6", "Durante o Carregamento"],
  [234, 22180, "BUDWEISER ZERO LONG NECK 330ML SIX-PACK SHRIN", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "26/05/2026, 15:20:58", "26/05/2026, 15:34:50", "26/05/2026, 15:36:13", "1.4", "Após o Carregamento"],
  [780, 2546, "ORIGINAL 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "17/06/2026, 07:00:30", "17/06/2026, 07:02:32", "17/06/2026, 07:02:51", "0.3", "Durante o Carregamento"],
  [548, 9795, "GUARANA ANTARCTICA ZERO PET 1L CAIXA C/12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "05/06/2026, 22:09:28", "05/06/2026, 22:10:07", "05/06/2026, 22:10:42", "0.6", "Durante o Carregamento"],
  [79, 2538, "ANTARCTICA PILSEN 600ML", 3, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "20/05/2026, 15:18:21", "20/05/2026, 15:28:04", "20/05/2026, 15:33:04", "5", "Após o Carregamento"],
  [316, 9067, "ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "29/05/2026, 04:29:35", "29/05/2026, 04:29:55", "29/05/2026, 04:30:33", "0.6", "Durante o Carregamento"],
  [866, 34027, "GUARANA CHP ANTARCTICA LATA 350ML SH C/12 NPAL MULTIPACK", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "22/06/2026, 23:49:21", "22/06/2026, 23:49:36", "22/06/2026, 23:49:52", "0.3", "Durante o Carregamento"],
  [900, 504, "PEPSI COLA PET 2L CAIXA C/6", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "26/06/2026, 04:55:05", "26/06/2026, 05:05:18", "26/06/2026, 05:06:12", "0.9", "Durante o Carregamento"],
  [354, 9083, "SKOL LT 473ML SH C/12 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "30/05/2026, 02:44:06", "30/05/2026, 02:45:06", "30/05/2026, 02:45:57", "0.9", "Durante o Carregamento"],
  [771, 20530, "STELLA ARTOIS 600 ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "16/06/2026, 23:06:23", "16/06/2026, 23:12:22", "16/06/2026, 23:12:57", "0.6", "Durante o Carregamento"],
  [806, 9083, "SKOL LT 473ML SH C/12 NPAL", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "19/06/2026, 04:16:27", "19/06/2026, 04:19:36", "19/06/2026, 04:20:07", "0.5", "Durante o Carregamento"],
  [35, 2546, "ORIGINAL 600ML", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "18/05/2026, 17:29:45", "18/05/2026, 17:34:01", "18/05/2026, 17:35:02", "1", "Após o Carregamento"],
  [340, 2546, "ORIGINAL 600ML", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "29/05/2026, 15:02:07", "29/05/2026, 15:16:01", "29/05/2026, 15:16:50", "0.8", "Após o Carregamento"],
  [692, 9091, "TONICA ANTARCTICA LATA 350ML SH C/12 NPAL", 1, "GILSON ROSA DA SILVA", "RONILDO", "CONCLUÍDO", "12/06/2026, 14:43:58", "12/06/2026, 16:35:31", "12/06/2026, 16:38:27", "2.9", "Após o Carregamento"],
  [24660, 20164, "SKOL LT 473ML SH C/12 NPAL MULTPACK 12", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "18/07/2026, 03:26:04", "18/07/2026, 03:27:42", "18/07/2026, 03:27:43", "—", "Durante o Carregamento"],
  [204, 23186, "SPATEN N 600ML", 1, "MATHEUS", "PAULO PEREIRA", "CONCLUÍDO", "26/05/2026, 04:10:16", "26/05/2026, 04:14:44", "26/05/2026, 04:14:45", "—", "Durante o Carregamento"]
];

const rawTasksBatch2: any[] = []; // To be appended in next step

async function runSeed() {
  console.log("Fetching active companies from Firestore...");
  let companies: string[] = ["demo"];
  try {
    const qSnap = await getDocs(collection(db, "empresas"));
    if (!qSnap.empty) {
      companies = qSnap.docs.map(d => d.id);
    }
  } catch (e) {
    console.log("Could not fetch companies from Firestore, defaulting to 'demo':", e);
  }
  
  console.log("Found companies:", companies);
  
  const allRawTasks = [...rawTasksBatch1, ...rawTasksBatch2];
  console.log(`Ready to parse and import ${allRawTasks.length} task records...`);
  
  function parsePTBRDateToISO(dateStr: string | null | undefined): string | null {
    if (!dateStr || dateStr === '—' || dateStr.trim() === '') return null;
    const parts = dateStr.split(', ');
    if (parts.length < 2) {
      const dParts = dateStr.split('/');
      if (dParts.length === 3) {
        return `${dParts[2]}-${dParts[1]}-${dParts[0]}T00:00:00.000Z`;
      }
      return null;
    }
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    if (dateParts.length !== 3 || timeParts.length < 2) return null;
    
    const day = dateParts[0].padStart(2, '0');
    const month = dateParts[1].padStart(2, '0');
    const year = dateParts[2];
    const hours = timeParts[0].padStart(2, '0');
    const minutes = timeParts[1].padStart(2, '0');
    const seconds = (timeParts[2] || '00').padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  for (const company of companies) {
    console.log(`Registering tasks for company: ${company}...`);
    let count = 0;
    
    for (const record of allRawTasks) {
      const [id, sku, desc, qty, conferente, operador, statusText, criado, iniciado, finalizado, duracao, tipo] = record;
      
      const statusMap = statusText === "CONCLUÍDO" ? 'done' : (statusText === "EM ANDAMENTO" ? 'in_progress' : 'pending');
      const parsedCriado = parsePTBRDateToISO(criado);
      const parsedIniciado = parsePTBRDateToISO(iniciado);
      const parsedFinalizado = parsePTBRDateToISO(finalizado);
      
      let durVal: number | null = parseFloat(duracao);
      if (isNaN(durVal)) {
        durVal = null;
      }
      
      const taskDoc = {
        empresaId: company,
        id: Number(id),
        codigo: Number(sku),
        descricao: String(desc),
        quantidade: Number(qty),
        conferente: String(conferente),
        operador: String(operador),
        status: statusMap,
        criadoEm: parsedCriado,
        iniciadoEm: parsedIniciado,
        finalizadoEm: parsedFinalizado,
        duracaoMin: durVal,
        tipoOperacao: String(tipo),
        locData: statusMap === 'done' ? {
          distanciaM: 100 + Math.floor(Math.random() * 200),
          totalIdleSec: 30 + Math.floor(Math.random() * 120),
          segmentosParado: Math.floor(Math.random() * 3),
          totalLeituras: Math.round(Number(qty) * 12)
        } : null
      };
      
      const docRef = doc(db, 'tarefas', `${company}-task-${id}`);
      await setDoc(docRef, taskDoc);
      count++;
    }
    console.log(`Successfully registered ${count} task records for ${company}!`);
  }
  
  console.log("Seeding completed successfully!");
}

runSeed().catch(console.error);
