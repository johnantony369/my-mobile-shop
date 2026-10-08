import fs from 'fs';
import path from 'path';

const MODELS_FILE = path.resolve('src/data/models_2019_present.json');
const OUTPUT_SPARES = path.resolve('src/data/master_spares_catalog.json');

// Comprehensive Battery Code Map for Indian Smartphone Models (2015 - Present)
const BATTERY_CODE_MAP = [
  // Xiaomi / Redmi / Poco (2015 - 2026)
  { brandGroup: 'xiaomi', code: 'BN30', models: ['Redmi 4A'] },
  { brandGroup: 'xiaomi', code: 'BN31', models: ['Redmi Note 5A', 'Redmi Note 5A Prime', 'Redmi Y1', 'Redmi Y1 Lite', 'Redmi Y2', 'Redmi S2', 'Mi A1'] },
  { brandGroup: 'xiaomi', code: 'BN34', models: ['Redmi 5A'] },
  { brandGroup: 'xiaomi', code: 'BN35', models: ['Redmi 5'] },
  { brandGroup: 'xiaomi', code: 'BN36', models: ['Mi 6X', 'Mi A2'] },
  { brandGroup: 'xiaomi', code: 'BN37', models: ['Redmi 6', 'Redmi 6A'] },
  { brandGroup: 'xiaomi', code: 'BM47', models: ['Redmi 3', 'Redmi 3S', 'Redmi 3X', 'Redmi 4X'] },
  { brandGroup: 'xiaomi', code: 'BN41', models: ['Redmi Note 4', 'Redmi Note 4X'] },
  { brandGroup: 'xiaomi', code: 'BN42', models: ['Redmi 4'] },
  { brandGroup: 'xiaomi', code: 'BN43', models: ['Redmi Note 4', 'Redmi Note 4X'] },
  { brandGroup: 'xiaomi', code: 'BN44', models: ['Redmi 5 Plus', 'Redmi Note 5'] },
  { brandGroup: 'xiaomi', code: 'BN45', models: ['Redmi Note 5 Pro'] },
  { brandGroup: 'xiaomi', code: 'BN47', models: ['Redmi 6 Pro', 'Mi A2 Lite'] },
  { brandGroup: 'xiaomi', code: 'BN48', models: ['Redmi Note 6 Pro'] },
  { brandGroup: 'xiaomi', code: 'BM4E', models: ['Poco F1', 'Mi 8'] },
  { brandGroup: 'xiaomi', code: 'BN46', models: ['Redmi Note 8', 'Redmi Note 8T', 'Redmi 7', 'Redmi Y3'] },
  { brandGroup: 'xiaomi', code: 'BM4J', models: ['Redmi Note 8 Pro'] },
  { brandGroup: 'xiaomi', code: 'BN49', models: ['Redmi 7A', 'Redmi 8A', 'Redmi 8A Dual'] },
  { brandGroup: 'xiaomi', code: 'BN51', models: ['Redmi 8', 'Redmi 8A'] },
  { brandGroup: 'xiaomi', code: 'BN52', models: ['Redmi Note 9 4G', 'Redmi 9T', 'Redmi 9 Power', 'Poco M3'] },
  { brandGroup: 'xiaomi', code: 'BN53', models: ['Redmi Note 9 Pro', 'Redmi Note 9 Pro Max', 'Redmi Note 10 Pro', 'Redmi Note 10 Pro Max', 'Poco M2 Pro'] },
  { brandGroup: 'xiaomi', code: 'BN54', models: ['Redmi Note 9', 'Redmi 10X 4G'] },
  { brandGroup: 'xiaomi', code: 'BN55', models: ['Redmi Note 9S', 'Redmi Note 9 Pro (Global)'] },
  { brandGroup: 'xiaomi', code: 'BN56', models: ['Poco X3', 'Poco X3 NFC', 'Poco X3 Pro'] },
  { brandGroup: 'xiaomi', code: 'BN57', models: ['Poco X3 Pro', 'Poco X3 GT'] },
  { brandGroup: 'xiaomi', code: 'BN59', models: ['Redmi Note 10', 'Redmi Note 10S'] },
  { brandGroup: 'xiaomi', code: 'BN5A', models: ['Redmi Note 10 5G', 'Redmi Note 10T 5G', 'Poco M3 Pro 5G', 'Redmi 10', 'Redmi 10 2022', 'Redmi 10 Prime'] },
  { brandGroup: 'xiaomi', code: 'BN5D', models: ['Redmi Note 11', 'Redmi Note 11S', 'Poco M4 Pro'] },
  { brandGroup: 'xiaomi', code: 'BN5E', models: ['Redmi Note 11 Pro 4G', 'Redmi Note 11 Pro 5G', 'Poco X4 Pro 5G'] },
  { brandGroup: 'xiaomi', code: 'BN5K', models: ['Redmi Note 12 4G', 'Redmi Note 12 5G', 'Poco X5 5G'] },
  { brandGroup: 'xiaomi', code: 'BN5L', models: ['Redmi Note 12 Pro 5G', 'Redmi Note 12 Pro+ 5G'] },
  { brandGroup: 'xiaomi', code: 'BN5M', models: ['Redmi 12 4G', 'Redmi 12 5G', 'Poco M6 Pro 5G'] },
  { brandGroup: 'xiaomi', code: 'BN5N', models: ['Redmi Note 13 4G', 'Redmi Note 13 5G'] },
  { brandGroup: 'xiaomi', code: 'BN5P', models: ['Redmi Note 13 Pro 5G', 'Poco X6 5G'] },
  { brandGroup: 'xiaomi', code: 'BN5R', models: ['Redmi Note 13 Pro+ 5G'] },
  { brandGroup: 'xiaomi', code: 'BN60', models: ['Poco M4 Pro 5G', 'Redmi Note 11S 5G', 'Redmi Note 11T 5G'] },
  { brandGroup: 'xiaomi', code: 'BN62', models: ['Poco M3', 'Redmi 9 Power', 'Redmi 9T'] },
  { brandGroup: 'xiaomi', code: 'BN65', models: ['Redmi 10C', 'Poco C40'] },
  { brandGroup: 'xiaomi', code: 'BM4Y', models: ['Poco F2 Pro', 'Redmi K30 Pro'] },
  { brandGroup: 'xiaomi', code: 'BM4R', models: ['Poco F3', 'Mi 11X', 'Mi 11i'] },
  { brandGroup: 'xiaomi', code: 'BM58', models: ['Poco F4', 'Redmi K40S'] },
  { brandGroup: 'xiaomi', code: 'BM59', models: ['Mi 11 Lite 4G', 'Mi 11 Lite 5G', 'Xiaomi 11 Lite 5G NE'] },
  { brandGroup: 'xiaomi', code: 'BP41', models: ['Redmi K20 Pro', 'Mi 9T Pro'] },
  { brandGroup: 'xiaomi', code: 'BP42', models: ['Redmi K30', 'Poco X2'] },

  // Samsung Galaxy (2015 - 2026)
  { brandGroup: 'samsung', code: 'EB-BJ200ABE', models: ['Galaxy J2', 'Galaxy J2 (2016)', 'Galaxy J2 (2017)'] },
  { brandGroup: 'samsung', code: 'EB-BG530BBE', models: ['Galaxy J2 Pro', 'Galaxy J2 Prime', 'Galaxy J5', 'Galaxy Grand Prime'] },
  { brandGroup: 'samsung', code: 'EB-BJ700BBC', models: ['Galaxy J7', 'Galaxy J7 (2016)'] },
  { brandGroup: 'samsung', code: 'EB-BG610ABE', models: ['Galaxy J7 Prime', 'Galaxy On7 (2016)', 'Galaxy J7 Max'] },
  { brandGroup: 'samsung', code: 'EB-BA730ABE', models: ['Galaxy J7 Pro', 'Galaxy A8+'] },
  { brandGroup: 'samsung', code: 'EB-BJ800ABE', models: ['Galaxy J6', 'Galaxy A6'] },
  { brandGroup: 'samsung', code: 'EB-BJ805ABE', models: ['Galaxy J8', 'Galaxy A6+'] },
  { brandGroup: 'samsung', code: 'EB-BG570ABE', models: ['Galaxy J5 Prime', 'Galaxy On5 (2016)'] },
  { brandGroup: 'samsung', code: 'EB-BG930ABE', models: ['Galaxy S7'] },
  { brandGroup: 'samsung', code: 'EB-BG935ABE', models: ['Galaxy S7 edge'] },
  { brandGroup: 'samsung', code: 'EB-BG950ABE', models: ['Galaxy S8'] },
  { brandGroup: 'samsung', code: 'EB-BG955ABE', models: ['Galaxy S8+'] },
  { brandGroup: 'samsung', code: 'EB-BG960ABE', models: ['Galaxy S9'] },
  { brandGroup: 'samsung', code: 'EB-BG965ABE', models: ['Galaxy S9+'] },
  { brandGroup: 'samsung', code: 'EB-BN950ABE', models: ['Galaxy Note 8'] },
  { brandGroup: 'samsung', code: 'EB-BN960ABE', models: ['Galaxy Note 9'] },
  { brandGroup: 'samsung', code: 'EB-BA015ABY', models: ['Galaxy A01', 'Galaxy M01', 'Galaxy A01 Core'] },
  { brandGroup: 'samsung', code: 'EB-BA022ABY', models: ['Galaxy A02', 'Galaxy A02s', 'Galaxy M02', 'Galaxy M02s', 'Galaxy A03', 'Galaxy A03s'] },
  { brandGroup: 'samsung', code: 'EB-BA125ABY', models: ['Galaxy A12', 'Galaxy M12', 'Galaxy A13', 'Galaxy A04', 'Galaxy A04s', 'Galaxy A04e', 'Galaxy A14', 'Galaxy A14 5G', 'Galaxy A15', 'Galaxy A15 5G'] },
  { brandGroup: 'samsung', code: 'EB-BA207ABY', models: ['Galaxy A20s'] },
  { brandGroup: 'samsung', code: 'EB-BA217ABY', models: ['Galaxy A21s', 'Galaxy A31', 'Galaxy A32', 'Galaxy M21', 'Galaxy M31'] },
  { brandGroup: 'samsung', code: 'EB-BA305ABU', models: ['Galaxy A30', 'Galaxy A50', 'Galaxy A30s', 'Galaxy A50s'] },
  { brandGroup: 'samsung', code: 'EB-BA315ABY', models: ['Galaxy A31', 'Galaxy A32 4G'] },
  { brandGroup: 'samsung', code: 'EB-BA336ABY', models: ['Galaxy A33 5G', 'Galaxy A53 5G'] },
  { brandGroup: 'samsung', code: 'EB-BA346ABY', models: ['Galaxy A34 5G', 'Galaxy A54 5G', 'Galaxy A35 5G', 'Galaxy A55 5G'] },
  { brandGroup: 'samsung', code: 'EB-BA515ABY', models: ['Galaxy A51'] },
  { brandGroup: 'samsung', code: 'EB-BA526ABY', models: ['Galaxy A52', 'Galaxy A52s 5G', 'Galaxy A52 5G'] },
  { brandGroup: 'samsung', code: 'EB-BA705ABU', models: ['Galaxy A70', 'Galaxy A70s'] },
  { brandGroup: 'samsung', code: 'EB-BA715ABY', models: ['Galaxy A71'] },
  { brandGroup: 'samsung', code: 'EB-BA725ABY', models: ['Galaxy A72'] },
  { brandGroup: 'samsung', code: 'EB-BA736ABY', models: ['Galaxy A73 5G'] },
  { brandGroup: 'samsung', code: 'EB-BM307ABY', models: ['Galaxy M30s', 'Galaxy M31', 'Galaxy M21', 'Galaxy M31s', 'Galaxy F41'] },
  { brandGroup: 'samsung', code: 'EB-BM315ABY', models: ['Galaxy M31', 'Galaxy M21'] },
  { brandGroup: 'samsung', code: 'EB-BM325ABY', models: ['Galaxy M32', 'Galaxy F22'] },
  { brandGroup: 'samsung', code: 'EB-BM336ABY', models: ['Galaxy M33 5G', 'Galaxy M34 5G', 'Galaxy F34 5G'] },
  { brandGroup: 'samsung', code: 'EB-BM515ABY', models: ['Galaxy M51', 'Galaxy F62'] },
  { brandGroup: 'samsung', code: 'EB-BM526ABY', models: ['Galaxy M52 5G'] },
  { brandGroup: 'samsung', code: 'EB-BG781ABY', models: ['Galaxy S20 FE', 'Galaxy S20 FE 5G'] },
  { brandGroup: 'samsung', code: 'EB-BG990ABY', models: ['Galaxy S21 FE 5G'] },
  { brandGroup: 'samsung', code: 'EB-BG991ABY', models: ['Galaxy S21 5G'] },
  { brandGroup: 'samsung', code: 'EB-BG996ABY', models: ['Galaxy S21+ 5G'] },
  { brandGroup: 'samsung', code: 'EB-BG998ABY', models: ['Galaxy S21 Ultra 5G'] },
  { brandGroup: 'samsung', code: 'EB-BS901ABY', models: ['Galaxy S22'] },
  { brandGroup: 'samsung', code: 'EB-BS906ABY', models: ['Galaxy S22+'] },
  { brandGroup: 'samsung', code: 'EB-BS908ABY', models: ['Galaxy S22 Ultra'] },
  { brandGroup: 'samsung', code: 'EB-BS911ABY', models: ['Galaxy S23'] },
  { brandGroup: 'samsung', code: 'EB-BS916ABY', models: ['Galaxy S23+'] },
  { brandGroup: 'samsung', code: 'EB-BS918ABY', models: ['Galaxy S23 Ultra'] },
  { brandGroup: 'samsung', code: 'EB-BS921ABY', models: ['Galaxy S24'] },
  { brandGroup: 'samsung', code: 'EB-BS926ABY', models: ['Galaxy S24+'] },
  { brandGroup: 'samsung', code: 'EB-BS928ABY', models: ['Galaxy S24 Ultra'] },

  // Vivo / iQOO (2015 - 2026)
  { brandGroup: 'vivo', code: 'B-B1', models: ['Vivo Y53'] },
  { brandGroup: 'vivo', code: 'B-B2', models: ['Vivo Y55', 'Vivo Y55s', 'Vivo Y55L'] },
  { brandGroup: 'vivo', code: 'B-C5', models: ['Vivo Y69'] },
  { brandGroup: 'vivo', code: 'B-D9', models: ['Vivo Y71', 'Vivo V9', 'Vivo V9 Youth'] },
  { brandGroup: 'vivo', code: 'B-E8', models: ['Vivo Y81', 'Vivo Y81i', 'Vivo Y83', 'Vivo Y83 Pro'] },
  { brandGroup: 'vivo', code: 'B-F3', models: ['Vivo Y91', 'Vivo Y91i', 'Vivo Y93', 'Vivo Y95'] },
  { brandGroup: 'vivo', code: 'B-B3', models: ['Vivo V5', 'Vivo V5s', 'Vivo V5 Lite'] },
  { brandGroup: 'vivo', code: 'B-D6', models: ['Vivo V7', 'Vivo V7 Plus'] },
  { brandGroup: 'vivo', code: 'B-F0', models: ['Vivo V11', 'Vivo V11 Pro'] },
  { brandGroup: 'vivo', code: 'B-O5', models: ['Vivo Y20', 'Vivo Y20i', 'Vivo Y20G', 'Vivo Y20A', 'Vivo Y12s', 'Vivo Y11s', 'Vivo Y15s', 'Vivo Y15a', 'Vivo Y16', 'Vivo Y21', 'Vivo Y21a', 'Vivo Y21e', 'Vivo Y21T', 'Vivo Y21s', 'Vivo Y01', 'Vivo Y02', 'Vivo Y02s', 'Vivo Y02t', 'Vivo Y30', 'Vivo Y50'] },
  { brandGroup: 'vivo', code: 'B-K3', models: ['Vivo Y17', 'Vivo Y15', 'Vivo Y12', 'Vivo Y3', 'Vivo U10', 'Vivo U20'] },
  { brandGroup: 'vivo', code: 'B-P8', models: ['Vivo Y33s', 'Vivo Y33T', 'Vivo Y73', 'Vivo Y75'] },
  { brandGroup: 'vivo', code: 'B-Q7', models: ['Vivo Y51 (2020)', 'Vivo Y51A'] },
  { brandGroup: 'vivo', code: 'B-S7', models: ['Vivo T1 5G', 'Vivo T1x', 'iQOO Z6 5G', 'iQOO Z6 Lite 5G'] },
  { brandGroup: 'vivo', code: 'B-U1', models: ['Vivo T1 Pro 5G', 'iQOO Z6 Pro 5G'] },
  { brandGroup: 'vivo', code: 'B-W7', models: ['Vivo T2 5G', 'iQOO Z7 5G', 'Vivo T2x 5G'] },
  { brandGroup: 'vivo', code: 'B-Z6', models: ['Vivo T3 5G', 'iQOO Z9 5G', 'Vivo T3x 5G'] },
  { brandGroup: 'vivo', code: 'B-M3', models: ['Vivo V20', 'Vivo V20 SE'] },
  { brandGroup: 'vivo', code: 'B-O8', models: ['Vivo V20 Pro'] },
  { brandGroup: 'vivo', code: 'B-S1', models: ['Vivo V21 5G', 'Vivo V21e 5G'] },
  { brandGroup: 'vivo', code: 'B-T6', models: ['Vivo V23 5G', 'Vivo V23e 5G'] },
  { brandGroup: 'vivo', code: 'B-W3', models: ['Vivo V25 5G', 'Vivo V25 Pro'] },
  { brandGroup: 'vivo', code: 'B-X8', models: ['Vivo V27 5G', 'Vivo V27 Pro'] },
  { brandGroup: 'vivo', code: 'B-Z4', models: ['Vivo V29 5G', 'Vivo V29 Pro', 'Vivo V30 5G', 'Vivo V30 Pro'] },

  // Realme / Oppo / OnePlus (2015 - 2026)
  { brandGroup: 'oppo_realme', code: 'BLP615', models: ['Oppo A37', 'Oppo A37f'] },
  { brandGroup: 'oppo_realme', code: 'BLP619', models: ['Oppo A57', 'Oppo A39'] },
  { brandGroup: 'oppo_realme', code: 'BLP641', models: ['Oppo A71'] },
  { brandGroup: 'oppo_realme', code: 'BLP649', models: ['Oppo A83'] },
  { brandGroup: 'oppo_realme', code: 'BLP601', models: ['Oppo F1s'] },
  { brandGroup: 'oppo_realme', code: 'BLP631', models: ['Oppo F3'] },
  { brandGroup: 'oppo_realme', code: 'BLP633', models: ['Oppo F5', 'Oppo F5 Youth'] },
  { brandGroup: 'oppo_realme', code: 'BLP661', models: ['Oppo F7'] },
  { brandGroup: 'oppo_realme', code: 'BLP673', models: ['Oppo A3s', 'Oppo A5', 'Realme 1', 'Realme 2', 'Realme C1'] },
  { brandGroup: 'oppo_realme', code: 'BLP683', models: ['Oppo F9', 'Oppo F9 Pro', 'Realme 2 Pro', 'Realme U1'] },
  { brandGroup: 'oppo_realme', code: 'BLP699', models: ['Oppo F11', 'Oppo F11 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP727', models: ['Realme 5', 'Realme 5s', 'Realme 5i', 'Realme 6i', 'Realme C3', 'Realme C11', 'Realme C12', 'Realme C15', 'Realme Narzo 10', 'Realme Narzo 10A', 'Realme Narzo 20A'] },
  { brandGroup: 'oppo_realme', code: 'BLP757', models: ['Realme 6', 'Realme 6s', 'Realme Narzo'] },
  { brandGroup: 'oppo_realme', code: 'BLP771', models: ['Realme 6 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP793', models: ['Realme 7', 'Realme Narzo 20 Pro', 'Realme Narzo 30'] },
  { brandGroup: 'oppo_realme', code: 'BLP803', models: ['Realme 7 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP817', models: ['Oppo A15', 'Oppo A15s', 'Oppo A16', 'Oppo A16e', 'Oppo A16k', 'Realme C20', 'Realme C21', 'Realme C11 2021'] },
  { brandGroup: 'oppo_realme', code: 'BLP805', models: ['Oppo A32', 'Oppo A33 2020', 'Oppo A52', 'Oppo A53 2020', 'Oppo A53s 5G', 'Oppo A54', 'Oppo A72', 'Oppo A92', 'Realme C17', 'Realme 7i'] },
  { brandGroup: 'oppo_realme', code: 'BLP859', models: ['Realme 8', 'Realme 8 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP861', models: ['Realme 8 5G', 'Realme Narzo 30 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP877', models: ['Realme 8i', 'Realme 8s 5G', 'Realme 9i'] },
  { brandGroup: 'oppo_realme', code: 'BLP895', models: ['Realme 9', 'Realme 9 5G', 'Realme Narzo 50'] },
  { brandGroup: 'oppo_realme', code: 'BLP901', models: ['Realme 9 Pro 5G', 'Realme 9 Pro+ 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP909', models: ['Realme 10', 'Realme 10 5G', 'Realme 11 5G', 'Realme 11x 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP911', models: ['Realme 10 Pro 5G', 'Realme 10 Pro+ 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP921', models: ['Realme C30', 'Realme C31', 'Realme C33', 'Realme C35', 'Realme Narzo 50A Prime', 'Realme Narzo 50i Prime'] },
  { brandGroup: 'oppo_realme', code: 'BLP931', models: ['Realme C51', 'Realme C53', 'Realme C55', 'Realme Narzo N53', 'Realme Narzo N55'] },
  { brandGroup: 'oppo_realme', code: 'BLP955', models: ['Realme C65', 'Realme C67', 'Realme Narzo 70'] },
  { brandGroup: 'oppo_realme', code: 'BLP923', models: ['Realme 11 Pro 5G', 'Realme 11 Pro+ 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP989', models: ['Realme 12 Pro 5G', 'Realme 12 Pro+ 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP735', models: ['Oppo Reno 2', 'Oppo Reno 2F', 'Oppo Reno 2Z'] },
  { brandGroup: 'oppo_realme', code: 'BLP741', models: ['Oppo Reno 3', 'Oppo Reno 3 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP755', models: ['Oppo Reno 4', 'Oppo Reno 4 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP811', models: ['Oppo Reno 5', 'Oppo Reno 5 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP843', models: ['Oppo Reno 6', 'Oppo Reno 6 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP881', models: ['Oppo Reno 7', 'Oppo Reno 7 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP903', models: ['Oppo Reno 8', 'Oppo Reno 8 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP933', models: ['Oppo Reno 10', 'Oppo Reno 10 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP977', models: ['Oppo Reno 11', 'Oppo Reno 11 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP613', models: ['OnePlus 3'] },
  { brandGroup: 'oppo_realme', code: 'BLP637', models: ['OnePlus 5', 'OnePlus 5T'] },
  { brandGroup: 'oppo_realme', code: 'BLP657', models: ['OnePlus 6'] },
  { brandGroup: 'oppo_realme', code: 'BLP685', models: ['OnePlus 6T'] },
  { brandGroup: 'oppo_realme', code: 'BLP743', models: ['OnePlus 8'] },
  { brandGroup: 'oppo_realme', code: 'BLP745', models: ['OnePlus 8 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP759', models: ['OnePlus Nord'] },
  { brandGroup: 'oppo_realme', code: 'BLP801', models: ['OnePlus 8T', 'OnePlus 9R'] },
  { brandGroup: 'oppo_realme', code: 'BLP827', models: ['OnePlus 9', 'OnePlus 9 Pro'] },
  { brandGroup: 'oppo_realme', code: 'BLP845', models: ['OnePlus Nord CE 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP879', models: ['OnePlus Nord 2 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP897', models: ['OnePlus Nord CE 2 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP917', models: ['OnePlus 10 Pro', 'OnePlus 10T'] },
  { brandGroup: 'oppo_realme', code: 'BLP927', models: ['OnePlus Nord CE 3 Lite 5G', 'OnePlus Nord 3 5G'] },
  { brandGroup: 'oppo_realme', code: 'BLP961', models: ['OnePlus 11', 'OnePlus 11R'] },
  { brandGroup: 'oppo_realme', code: 'BLP987', models: ['OnePlus 12', 'OnePlus 12R', 'OnePlus Nord 4'] },

  // Apple iPhone (2015 - 2026)
  { brandGroup: 'apple', code: 'A1688-BAT', models: ['iPhone 6s'] },
  { brandGroup: 'apple', code: 'A1687-BAT', models: ['iPhone 6s Plus'] },
  { brandGroup: 'apple', code: 'A1723-BAT', models: ['iPhone SE (1st gen)', 'iPhone SE'] },
  { brandGroup: 'apple', code: 'A1778-BAT', models: ['iPhone 7'] },
  { brandGroup: 'apple', code: 'A1784-BAT', models: ['iPhone 7 Plus'] },
  { brandGroup: 'apple', code: 'A1905-BAT', models: ['iPhone 8'] },
  { brandGroup: 'apple', code: 'A1897-BAT', models: ['iPhone 8 Plus'] },
  { brandGroup: 'apple', code: 'A1901-BAT', models: ['iPhone X'] },
  { brandGroup: 'apple', code: 'A2105-BAT', models: ['iPhone XR'] },
  { brandGroup: 'apple', code: 'A2097-BAT', models: ['iPhone XS'] },
  { brandGroup: 'apple', code: 'A2101-BAT', models: ['iPhone XS Max'] },
  { brandGroup: 'apple', code: 'A2221-BAT', models: ['iPhone 11'] },
  { brandGroup: 'apple', code: 'A2215-BAT', models: ['iPhone 11 Pro'] },
  { brandGroup: 'apple', code: 'A2218-BAT', models: ['iPhone 11 Pro Max'] },
  { brandGroup: 'apple', code: 'A2312-BAT', models: ['iPhone 12', 'iPhone 12 Pro'] },
  { brandGroup: 'apple', code: 'A2471-BAT', models: ['iPhone 12 mini'] },
  { brandGroup: 'apple', code: 'A2466-BAT', models: ['iPhone 12 Pro Max'] },
  { brandGroup: 'apple', code: 'A2653-BAT', models: ['iPhone 13'] },
  { brandGroup: 'apple', code: 'A2655-BAT', models: ['iPhone 13 Pro'] },
  { brandGroup: 'apple', code: 'A2656-BAT', models: ['iPhone 13 Pro Max'] },
  { brandGroup: 'apple', code: 'A2660-BAT', models: ['iPhone 13 mini'] },
  { brandGroup: 'apple', code: 'A2863-BAT', models: ['iPhone 14'] },
  { brandGroup: 'apple', code: 'A2866-BAT', models: ['iPhone 14 Plus'] },
  { brandGroup: 'apple', code: 'A2867-BAT', models: ['iPhone 14 Pro'] },
  { brandGroup: 'apple', code: 'A2868-BAT', models: ['iPhone 14 Pro Max'] },
  { brandGroup: 'apple', code: 'A3090-BAT', models: ['iPhone 15'] },
  { brandGroup: 'apple', code: 'A3094-BAT', models: ['iPhone 15 Plus'] },
  { brandGroup: 'apple', code: 'A3101-BAT', models: ['iPhone 15 Pro'] },
  { brandGroup: 'apple', code: 'A3105-BAT', models: ['iPhone 15 Pro Max'] },
  { brandGroup: 'apple', code: 'A2296-BAT', models: ['iPhone SE (2020)'] },
  { brandGroup: 'apple', code: 'A2819-BAT', models: ['iPhone SE (2022)'] },

  // Apple iPad (2017 - 2026)
  { brandGroup: 'apple', code: 'A1484-BAT', models: ['iPad 9.7 (2017)', 'iPad 9.7 (2018)', 'iPad (5th gen)', 'iPad (6th gen)'] },
  { brandGroup: 'apple', code: 'A2169-BAT', models: ['iPad 10.2 (2019)', 'iPad 10.2 (2020)', 'iPad 10.2 (2021)', 'iPad 7th Gen', 'iPad 8th Gen', 'iPad 9th Gen'] },
  { brandGroup: 'apple', code: 'A2776-BAT', models: ['iPad (2022)', 'iPad 10th Gen', 'iPad (2025)'] },
  { brandGroup: 'apple', code: 'A2132-BAT', models: ['iPad mini (2019)', 'iPad mini 5'] },
  { brandGroup: 'apple', code: 'A2522-BAT', models: ['iPad mini (2021)', 'iPad mini (2024)', 'iPad mini 6', 'iPad mini 7'] },
  { brandGroup: 'apple', code: 'A2134-BAT', models: ['iPad Air (2019)', 'iPad Air 3'] },
  { brandGroup: 'apple', code: 'A2251-BAT', models: ['iPad Air (2020)', 'iPad Air (2022)', 'iPad Air 4', 'iPad Air 5'] },
  { brandGroup: 'apple', code: 'A3038-BAT', models: ['iPad Air 11 (2024)', 'iPad Air 13 (2024)', 'iPad Air 11 (2025)', 'iPad Air 13 (2025)', 'iPad Air 11 (2026)', 'iPad Air 13 (2026)'] },
  { brandGroup: 'apple', code: 'A1798-BAT', models: ['iPad Pro 10.5 (2017)'] },
  { brandGroup: 'apple', code: 'A1982-BAT', models: ['iPad Pro 11 (2018)', 'iPad Pro 11 1st Gen'] },
  { brandGroup: 'apple', code: 'A2224-BAT', models: ['iPad Pro 11 (2020)', 'iPad Pro 11 2nd Gen'] },
  { brandGroup: 'apple', code: 'A2369-BAT', models: ['iPad Pro 11 (2021)', 'iPad Pro 11 3rd Gen'] },
  { brandGroup: 'apple', code: 'A2769-BAT', models: ['iPad Pro 11 (2022)', 'iPad Pro 11 4th Gen'] },
  { brandGroup: 'apple', code: 'A2934-BAT', models: ['iPad Pro 11 (2024)', 'iPad Pro 11 (2025)'] },
  { brandGroup: 'apple', code: 'A1754-BAT', models: ['iPad Pro 12.9 (2017)', 'iPad Pro 12.9 2nd Gen'] },
  { brandGroup: 'apple', code: 'A2043-BAT', models: ['iPad Pro 12.9 (2018)', 'iPad Pro 12.9 3rd Gen'] },
  { brandGroup: 'apple', code: 'A2064-BAT', models: ['iPad Pro 12.9 (2020)', 'iPad Pro 12.9 4th Gen'] },
  { brandGroup: 'apple', code: 'A2389-BAT', models: ['iPad Pro 12.9 (2021)', 'iPad Pro 12.9 5th Gen'] },
  { brandGroup: 'apple', code: 'A2768-BAT', models: ['iPad Pro 12.9 (2022)', 'iPad Pro 12.9 6th Gen'] },
  { brandGroup: 'apple', code: 'A3008-BAT', models: ['iPad Pro 13 (2024)', 'iPad Pro 13 (2025)'] },

  // Samsung Galaxy Tab Batteries
  { brandGroup: 'samsung', code: 'EB-BT295ABU', models: ['Galaxy Tab A 8.0 (2019)', 'Galaxy Tab A 8.0 (2018)', 'Galaxy Tab A 8.0 (2017)'] },
  { brandGroup: 'samsung', code: 'EB-BT515ABU', models: ['Galaxy Tab A 10.1 (2019)'] },
  { brandGroup: 'samsung', code: 'EB-BT505ABY', models: ['Galaxy Tab A7 10.4 (2020)', 'Galaxy Tab A7 10.4 (2022)'] },
  { brandGroup: 'samsung', code: 'EB-BT225ABU', models: ['Galaxy Tab A7 Lite'] },
  { brandGroup: 'samsung', code: 'EB-BX200ABY', models: ['Galaxy Tab A8 10.5 (2021)'] },
  { brandGroup: 'samsung', code: 'EB-BX110ABY', models: ['Galaxy Tab A9'] },
  { brandGroup: 'samsung', code: 'EB-BX210ABY', models: ['Galaxy Tab A9+'] },
  { brandGroup: 'samsung', code: 'EB-BT615ABU', models: ['Galaxy Tab S6 Lite (2020)', 'Galaxy Tab S6 Lite (2022)', 'Galaxy Tab S6 Lite (2024)', 'Galaxy Tab S6'] },
  { brandGroup: 'samsung', code: 'EB-BT875ABY', models: ['Galaxy Tab S7', 'Galaxy Tab S8'] },
  { brandGroup: 'samsung', code: 'EB-BT975ABY', models: ['Galaxy Tab S7+', 'Galaxy Tab S7 FE', 'Galaxy Tab S8+'] },
  { brandGroup: 'samsung', code: 'EB-BX900ABY', models: ['Galaxy Tab S8 Ultra', 'Galaxy Tab S9 Ultra'] },
  { brandGroup: 'samsung', code: 'EB-BX710ABY', models: ['Galaxy Tab S9'] },
  { brandGroup: 'samsung', code: 'EB-BX810ABY', models: ['Galaxy Tab S9+'] },
  { brandGroup: 'samsung', code: 'EB-BX510ABY', models: ['Galaxy Tab S9 FE'] },
  { brandGroup: 'samsung', code: 'EB-BX610ABY', models: ['Galaxy Tab S9 FE+'] },

  // Xiaomi & Redmi & Poco Pad Batteries
  { brandGroup: 'xiaomi', code: 'BN80', models: ['Xiaomi Pad 5', 'Xiaomi Pad 5 Pro', 'Pad 5', 'Pad 5 Pro'] },
  { brandGroup: 'xiaomi', code: 'BN82', models: ['Xiaomi Pad 6', 'Xiaomi Pad 6 Pro', 'Pad 6', 'Pad 6 Pro'] },
  { brandGroup: 'xiaomi', code: 'BN84', models: ['Redmi Pad'] },
  { brandGroup: 'xiaomi', code: 'BN85', models: ['Redmi Pad SE', 'Redmi Pad SE 8.7'] },
  { brandGroup: 'xiaomi', code: 'BN86', models: ['Redmi Pad Pro', 'Redmi Pad Pro 5G', 'Poco Pad'] },

  // OnePlus & Realme Pad Batteries
  { brandGroup: 'oppo_realme', code: 'BLP877', models: ['Realme Pad'] },
  { brandGroup: 'oppo_realme', code: 'BLP917-PAD', models: ['Realme Pad Mini'] },
  { brandGroup: 'oppo_realme', code: 'BLP997', models: ['Realme Pad 2', 'Realme Pad 2 Lite'] },
  { brandGroup: 'oppo_realme', code: 'BLP989', models: ['OnePlus Pad', 'Oppo Pad 2'] },
  { brandGroup: 'oppo_realme', code: 'BLP991', models: ['OnePlus Pad Go'] },
  { brandGroup: 'oppo_realme', code: 'BLP993', models: ['OnePlus Pad 2', 'Oppo Pad 3'] },

  // Lenovo Tablet Batteries
  { brandGroup: 'lenovo', code: 'L16D1P34', models: ['Lenovo Tab 4 8', 'Lenovo Tab 4 10', 'Lenovo Tab E10', 'Lenovo Tab M10', 'Lenovo Tab M10 HD'] },
  { brandGroup: 'lenovo', code: 'L19D1P31', models: ['Lenovo Tab M7', 'Lenovo Tab M8 HD', 'Lenovo Tab M8 Gen 3', 'Lenovo Tab M8 Gen 4'] },
  { brandGroup: 'lenovo', code: 'L19D2P32', models: ['Lenovo Tab M10 FHD Plus', 'Lenovo Tab M10 HD Gen 2', 'Lenovo Tab K10'] },
  { brandGroup: 'lenovo', code: 'L21D2P32', models: ['Lenovo Tab M10 Plus Gen 3', 'Lenovo Tab M11'] },
  { brandGroup: 'lenovo', code: 'L20D2P32', models: ['Lenovo Tab P11', 'Lenovo Tab P11 Plus', 'Lenovo Tab P11 Gen 2', 'Lenovo Yoga Tab 11'] },
  { brandGroup: 'lenovo', code: 'L20D2P31', models: ['Lenovo Tab P11 Pro', 'Lenovo Tab P12 Pro'] },

  // Infinix & Tecno
  { brandGroup: 'transsion', code: 'BL-49FX', models: ['Infinix Hot 8', 'Infinix Hot 9', 'Infinix Hot 10 Play'] },
  { brandGroup: 'transsion', code: 'BL-58BX', models: ['Infinix Note 7', 'Infinix Note 8'] },
  { brandGroup: 'transsion', code: 'BL-49NX', models: ['Infinix Note 10', 'Infinix Note 11'] },
  { brandGroup: 'transsion', code: 'BL-49FT', models: ['Tecno Spark 6', 'Tecno Spark 7', 'Tecno Pova'] },
  { brandGroup: 'transsion', code: 'BL-58ET', models: ['Tecno Spark 8', 'Tecno Spark 9', 'Tecno Camon 18'] },
  { brandGroup: 'transsion', code: 'BL-49GX', models: ['Tecno Spark 10', 'Tecno Spark 20', 'Tecno Pova 5'] }
];

function getBrandGroup(brand) {
  const b = brand.toLowerCase();
  if (['xiaomi', 'redmi', 'poco'].includes(b)) return 'xiaomi';
  if (['oppo', 'realme', 'oneplus'].includes(b)) return 'oppo_realme';
  if (['vivo', 'iqoo'].includes(b)) return 'vivo';
  if (b === 'samsung') return 'samsung';
  if (b === 'apple') return 'apple';
  if (['infinix', 'tecno'].includes(b)) return 'transsion';
  if (b === 'lenovo') return 'lenovo';
  if (b === 'honor') return 'honor';
  return 'other';
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findBatteryInfo(deviceModel, brand) {
  const targetGroup = getBrandGroup(brand);
  const normDevice = normalize(deviceModel);

  for (const entry of BATTERY_CODE_MAP) {
    if (entry.brandGroup !== targetGroup) continue;

    for (const m of entry.models) {
      const normM = normalize(m);
      const bareM = normM.replace(/^(redmi|poco|xiaomi|galaxy|vivo|iqoo|oppo|realme|oneplus|iphone|infinix|tecno)\s+/, '');
      const bareDevice = normDevice.replace(/^(redmi|poco|xiaomi|galaxy|vivo|iqoo|oppo|realme|oneplus|iphone|infinix|tecno)\s+/, '');

      if (normDevice === normM || bareDevice === bareM || normDevice.endsWith(` ${bareM}`) || normM.endsWith(` ${bareDevice}`)) {
        return {
          partCode: entry.code,
          compatibleModels: entry.models
        };
      }
    }
  }

  // Fallback prefix based on brand conventions
  let defaultCode = undefined;
  if (targetGroup === 'xiaomi') defaultCode = 'BN-OEM';
  else if (targetGroup === 'samsung') defaultCode = 'EB-OEM';
  else if (targetGroup === 'vivo') defaultCode = 'B-OEM';
  else if (targetGroup === 'oppo_realme') defaultCode = 'BLP-OEM';
  else if (targetGroup === 'apple') defaultCode = 'IPH-BAT';

  return {
    partCode: defaultCode,
    compatibleModels: [deviceModel]
  };
}

function getAveragePricing(category, brand, releaseYear, isTablet) {
  const isApple = brand === 'Apple';
  const isOlder = releaseYear && releaseYear < 2019;

  if (isTablet) {
    switch (category) {
      case 'display':
        return isApple
          ? (isOlder ? { wholesale: 3800, cost: 2900 } : { wholesale: 6500, cost: 5200 })
          : (isOlder ? { wholesale: 1900, cost: 1450 } : { wholesale: 3200, cost: 2400 });
      case 'battery':
        return isApple
          ? (isOlder ? { wholesale: 1100, cost: 850 } : { wholesale: 1650, cost: 1250 })
          : (isOlder ? { wholesale: 650, cost: 480 } : { wholesale: 950, cost: 720 });
      case 'charging_board':
        return isApple ? { wholesale: 480, cost: 320 } : { wholesale: 280, cost: 180 };
      case 'back_panel':
        return isApple ? { wholesale: 1200, cost: 850 } : { wholesale: 550, cost: 380 };
      case 'camera_glass':
        return { wholesale: 90, cost: 40 };
      case 'flex':
        return { wholesale: 180, cost: 95 };
      case 'speaker':
        return { wholesale: 160, cost: 85 };
      case 'glass_oca':
        return isApple ? { wholesale: 350, cost: 180 } : { wholesale: 220, cost: 110 };
      default:
        return { wholesale: 280, cost: 140 };
    }
  }

  switch (category) {
    case 'display':
      if (isApple) return isOlder ? { wholesale: 1600, cost: 1200 } : { wholesale: 3200, cost: 2600 };
      return isOlder ? { wholesale: 750, cost: 580 } : { wholesale: 1250, cost: 950 };
    case 'battery':
      if (isApple) return isOlder ? { wholesale: 650, cost: 480 } : { wholesale: 950, cost: 700 };
      return isOlder ? { wholesale: 380, cost: 280 } : { wholesale: 480, cost: 360 };
    case 'charging_board':
      if (isApple) return isOlder ? { wholesale: 300, cost: 200 } : { wholesale: 450, cost: 320 };
      return isOlder ? { wholesale: 120, cost: 70 } : { wholesale: 160, cost: 95 };
    case 'back_panel':
      if (isApple) return isOlder ? { wholesale: 250, cost: 150 } : { wholesale: 450, cost: 300 };
      return isOlder ? { wholesale: 150, cost: 90 } : { wholesale: 220, cost: 130 };
    case 'camera_glass':
      return { wholesale: 70, cost: 30 };
    case 'flex':
      return { wholesale: 110, cost: 55 };
    case 'speaker':
      return { wholesale: 90, cost: 45 };
    case 'glass_oca':
      return { wholesale: 120, cost: 50 };
    default:
      return { wholesale: 180, cost: 90 };
  }
}

async function main() {
  console.log('Loading models dataset...');
  if (!fs.existsSync(MODELS_FILE)) {
    throw new Error(`Models file not found: ${MODELS_FILE}`);
  }

  const models = JSON.parse(fs.readFileSync(MODELS_FILE, 'utf-8'));
  console.log(`Loaded ${models.length} models.`);

  const masterSpares = [];
  let mappedBatteryCount = 0;

  for (const device of models) {
    const { id: deviceId, brand, model, photoUrl, releaseYear } = device;
    const isTablet = /ipad|tab\b|pad\b|tablet/i.test(model);
    const batInfo = findBatteryInfo(model, brand);
    if (batInfo.partCode && !batInfo.partCode.endsWith('-OEM')) {
      mappedBatteryCount++;
    }

    // 1. Display
    const dispPrices = getAveragePricing('display', brand, releaseYear, isTablet);
    masterSpares.push({
      id: `${deviceId}_display`,
      deviceId,
      brand,
      model,
      category: 'display',
      partName: isTablet ? `${model} LCD Display & Touch Digitizer Assembly` : `${model} Display Combo (Folder)`,
      wholesalePrice: dispPrices.wholesale,
      costPrice: dispPrices.cost,
      photoUrl,
      compatibleModels: [model]
    });

    // 2. Battery
    const batPrices = getAveragePricing('battery', brand, releaseYear, isTablet);
    masterSpares.push({
      id: `${deviceId}_battery`,
      deviceId,
      brand,
      model,
      category: 'battery',
      partName: `${model} Battery Replacement`,
      partCode: batInfo.partCode,
      wholesalePrice: batPrices.wholesale,
      costPrice: batPrices.cost,
      compatibleModels: batInfo.compatibleModels
    });

    // 3. Charging Port
    const ccPrices = getAveragePricing('charging_board', brand, releaseYear, isTablet);
    masterSpares.push({
      id: `${deviceId}_charging_board`,
      deviceId,
      brand,
      model,
      category: 'charging_board',
      partName: isTablet ? `${model} Charging Port Flex Cable / Board` : `${model} Charging Sub-Board (CC Board with Mic)`,
      wholesalePrice: ccPrices.wholesale,
      costPrice: ccPrices.cost,
      compatibleModels: [model]
    });

    // 4. Back Panel Door Cover
    const backPrices = getAveragePricing('back_panel', brand, releaseYear, isTablet);
    masterSpares.push({
      id: `${deviceId}_back_panel`,
      deviceId,
      brand,
      model,
      category: 'back_panel',
      partName: isTablet ? `${model} Housing / Back Cover` : `${model} Back Panel Battery Cover`,
      wholesalePrice: backPrices.wholesale,
      costPrice: backPrices.cost,
      compatibleModels: [model]
    });

    // 5. Camera Glass Lens
    const camPrices = getAveragePricing('camera_glass', brand, releaseYear, isTablet);
    masterSpares.push({
      id: `${deviceId}_camera_glass`,
      deviceId,
      brand,
      model,
      category: 'camera_glass',
      partName: `${model} Camera Glass Lens with Frame`,
      wholesalePrice: camPrices.wholesale,
      costPrice: camPrices.cost,
      compatibleModels: [model]
    });

    // 6. Main Sub Connecting Flex
    const flexPrices = getAveragePricing('flex', brand, releaseYear, isTablet);
    masterSpares.push({
      id: `${deviceId}_flex`,
      deviceId,
      brand,
      model,
      category: 'flex',
      partName: isTablet ? `${model} Power & Volume Button Flex Cable` : `${model} Main Sub Connecting Motherboard Flex`,
      wholesalePrice: flexPrices.wholesale,
      costPrice: flexPrices.cost,
      compatibleModels: [model]
    });

    // 7. Ringer Loudspeaker Buzzer
    const speakerPrices = getAveragePricing('speaker', brand, releaseYear, isTablet);
    masterSpares.push({
      id: `${deviceId}_speaker`,
      deviceId,
      brand,
      model,
      category: 'speaker',
      partName: isTablet ? `${model} Internal Loudspeaker Module` : `${model} Ringer Loudspeaker Buzzer Box`,
      wholesalePrice: speakerPrices.wholesale,
      costPrice: speakerPrices.cost,
      compatibleModels: [model]
    });

    // 8. Front OCA Glass
    const ocaPrices = getAveragePricing('glass_oca', brand, releaseYear, isTablet);
    masterSpares.push({
      id: `${deviceId}_glass_oca`,
      deviceId,
      brand,
      model,
      category: 'glass_oca',
      partName: isTablet ? `${model} Front Touch Glass Digitizer OCA Replacement` : `${model} Front Outer Touch Glass (OCA)`,
      wholesalePrice: ocaPrices.wholesale,
      costPrice: ocaPrices.cost,
      compatibleModels: [model]
    });
  }

  fs.writeFileSync(OUTPUT_SPARES, JSON.stringify(masterSpares, null, 2), 'utf-8');

  console.log(`\n========================================`);
  console.log(`Generated ${masterSpares.length} master spare parts for ${models.length} models (2015-present).`);
  console.log(`Explicitly mapped battery codes: ${mappedBatteryCount} devices.`);
  console.log(`Saved to: ${OUTPUT_SPARES}`);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
