import os
import csv
import math

# Target Directory inside workspace
workspace_dir = "/Users/chunjun/Desktop/Build/Agent-harness/ScienceX/cell_viability_tables"
os.makedirs(workspace_dir, exist_ok=True)

# Helper function to compute mean, standard deviation, and CV%
def calc_stats(values):
    n = len(values)
    if n == 0:
        return 0.0, 0.0, 0.0
    mean_val = sum(values) / n
    variance = sum((x - mean_val) ** 2 for x in values) / (n - 1 if n > 1 else 1)
    sd_val = math.sqrt(variance)
    cv_pct = (sd_val / mean_val * 100.0) if mean_val != 0 else 0.0
    return mean_val, sd_val, cv_pct

# ==========================================
# 1. CCK-8 Dose Response Pilot Data
# ==========================================
cck8_header = [
    "分组 ID (Group)",
    "化合物浓度 (Concentration μM)",
    "Raw OD450 孔1",
    "Raw OD450 孔2",
    "Raw OD450 孔3",
    "Raw OD450 孔4",
    "Raw OD450 孔5",
    "Mean OD450 (平均吸光度)",
    "Net OD450 (净吸光度: Mean - Blank)",
    "Cell Viability % (细胞活力%)",
    "Inhibition Rate % (细胞抑制率%)",
    "SD (标准差)",
    "CV % (变异系数)",
    "实验备注 (Notes)"
]

raw_cck8_rows = [
    ("Blank (空白对照组)", 0.00, [0.052, 0.054, 0.051, 0.053, 0.050], "无细胞无药物，加培养基与CCK-8"),
    ("Control (阴性对照组)", 0.00, [1.482, 1.510, 1.465, 1.498, 1.470], "含细胞，加0.1% DMSO溶剂对照"),
    ("Compound X-402 (0.01μM)", 0.01, [1.458, 1.472, 1.440, 1.468, 1.462], "低浓度，极微弱抑制"),
    ("Compound X-402 (0.10μM)", 0.10, [1.355, 1.378, 1.340, 1.362, 1.380], "轻微抑制作用"),
    ("Compound X-402 (1.00μM)", 1.00, [1.085, 1.102, 1.070, 1.115, 1.098], "开始出现显著抑制作用"),
    ("Compound X-402 (5.00μM)", 5.00, [0.742, 0.760, 0.730, 0.755, 0.748], "接近预计 IC50 点 (~4.8 μM)"),
    ("Compound X-402 (25.00μM)", 25.00, [0.352, 0.368, 0.345, 0.360, 0.365], "强抑制作用 (>75% 死亡)"),
    ("Compound X-402 (100.00μM)", 100.00, [0.140, 0.148, 0.138, 0.145, 0.144], "高浓度毒性平台区")
]

# Process CCK8 stats
blank_mean = sum(raw_cck8_rows[0][2]) / len(raw_cck8_rows[0][2])
control_net_od = (sum(raw_cck8_rows[1][2]) / len(raw_cck8_rows[1][2])) - blank_mean

cck8_processed = []
for group, conc, reps, note in raw_cck8_rows:
    m_od, sd_od, cv_od = calc_stats(reps)
    net_od = m_od - blank_mean if conc != 0 or "Blank" not in group else m_od
    if "Blank" in group:
        net_od = 0.0
        viab = 0.0
        inhib = 0.0
    else:
        viab = (net_od / control_net_od * 100.0)
        inhib = 100.0 - viab
    
    row = [
        group,
        f"{conc:.2f}" if conc > 0 else ("0.00" if "Control" in group else "-"),
        f"{reps[0]:.3f}", f"{reps[1]:.3f}", f"{reps[2]:.3f}", f"{reps[3]:.3f}", f"{reps[4]:.3f}",
        f"{m_od:.4f}",
        f"{net_od:.4f}",
        f"{viab:.2f}%" if "Blank" not in group else "-",
        f"{inhib:.2f}%" if "Blank" not in group else "-",
        f"{sd_od:.4f}",
        f"{cv_od:.2f}%",
        note
    ]
    cck8_processed.append(row)

# ==========================================
# 2. Cell Seeding Density & Incubation Time Optimization
# ==========================================
density_header = [
    "接种密度 (Cells/well)",
    "24h Mean OD450", "24h SD", "24h 评价 (Assessment)",
    "48h Mean OD450", "48h SD", "48h 评价 (Assessment)",
    "72h Mean OD450", "72h SD", "72h 评价 (Assessment)",
    "综合推荐级别 (Recommendation)"
]

density_data = [
    ["1000", "0.215", "0.012", "吸光度偏低 (OD < 0.5)", "0.385", "0.018", "仍偏低", "0.690", "0.025", "适宜", "适合长周期 (72h) 实验"],
    ["2000", "0.342", "0.015", "偏低", "0.680", "0.028", "适宜 (进入对数期)", "1.240", "0.042", "良好 (线性区)", "适合 48-72h 药物敏感性实验"],
    ["4000", "0.580", "0.022", "良好", "1.185", "0.039", "最佳窗口期 (OD 1.0-1.5)", "1.950", "0.055", "接近饱和", "【首选推荐】48h 经典抗肿瘤预实验"],
    ["8000", "0.985", "0.035", "最佳 (OD ~ 1.0)", "1.890", "0.062", "较高 (接近触发接触抑制)", "2.450", "0.078", "过饱合区 (无法反映增殖)", "适合 24h 快速毒性筛查"],
    ["12000", "1.420", "0.048", "较高", "2.380", "0.085", "过度融合 (OD > 2.0)", "2.610", "0.092", "平台期/细胞脱落", "不推荐 (>24h易脱落)"],
    ["16000", "1.850", "0.060", "接近上限", "2.580", "0.090", "已过饱合", "2.680", "0.095", "大量细胞死失脱落", "不推荐"]
]

# ==========================================
# 3. Calcein-AM / PI Live/Dead Dual-Staining Assay
# ==========================================
livedead_header = [
    "实验分组 (Group)",
    "化合物浓度 (μM)",
    "Calcein-AM RFU (活细胞绿荧光 Rep1)",
    "Calcein-AM RFU (Rep2)",
    "Calcein-AM RFU (Rep3)",
    "Calcein-AM RFU (Rep4)",
    "Mean Calcein RFU (活细胞荧光均值)",
    "PI RFU (死细胞红荧光 Rep1)",
    "PI RFU (Rep2)",
    "PI RFU (Rep3)",
    "PI RFU (Rep4)",
    "Mean PI RFU (死细胞荧光均值)",
    "Calculated Live Cell % (活细胞比例%)",
    "Calculated Dead Cell % (死细胞比例%)",
    "Live/Dead Signal Ratio",
    "表型评估 (Phenotype)"
]

raw_livedead_rows = [
    ("Control (阴性对照)", 0.0, [15380, 15520, 15290, 15490], [410, 395, 425, 410], "细胞贴壁饱满，呈强绿色荧光"),
    ("Compound X-402 (1.0 μM)", 1.0, [11920, 11780, 11890, 11810], [1820, 1890, 1810, 1880], "少部分细胞变圆，出现散在红色荧光"),
    ("Compound X-402 (10.0 μM)", 10.0, [4250, 4310, 4220, 4340], [8890, 9020, 8910, 8980], "多数细胞死失，红色荧光显著增强"),
    ("Compound X-402 (50.0 μM)", 50.0, [1100, 1150, 1090, 1140], [13750, 13890, 13710, 13850], "绝大部分细胞解体，呈密集红荧光"),
    ("Positive Control (1% Triton X-100)", 0.0, [290, 270, 280, 280], [15800, 15920, 15790, 15890], "膜完全穿孔，100% 死细胞阳性对照")
]

livedead_processed = []
for group, conc, c_reps, p_reps, note in raw_livedead_rows:
    m_c, sd_c, _ = calc_stats(c_reps)
    m_p, sd_p, _ = calc_stats(p_reps)
    total_rfu = m_c + m_p
    live_pct = (m_c / total_rfu * 100.0) if total_rfu > 0 else 0.0
    dead_pct = (m_p / total_rfu * 100.0) if total_rfu > 0 else 0.0
    ld_ratio = (m_c / m_p) if m_p > 0 else 0.0
    
    row = [
        group,
        f"{conc:.1f}" if conc > 0 else "-",
        str(c_reps[0]), str(c_reps[1]), str(c_reps[2]), str(c_reps[3]),
        f"{m_c:.1f}",
        str(p_reps[0]), str(p_reps[1]), str(p_reps[2]), str(p_reps[3]),
        f"{m_p:.1f}",
        f"{live_pct:.2f}%",
        f"{dead_pct:.2f}%",
        f"{ld_ratio:.2f}",
        note
    ]
    livedead_processed.append(row)

# ==========================================
# 4. CellTiter-Glo ATP Luminescence Assay
# ==========================================
atp_header = [
    "实验分组 (Group)",
    "浓度 (μM)",
    "RLU 孔1 (Luminescence)",
    "RLU 孔2",
    "RLU 孔3",
    "RLU 孔4",
    "Mean RLU (平均发光值)",
    "Net RLU (净发光值: Mean - Blank)",
    "Cell Viability % (细胞活力%)",
    "SD (标准差)",
    "CV % (变异系数)",
    "信噪比 S/B Ratio",
    "实验结论与评估"
]

raw_atp_rows = [
    ("Blank (培养基+CTG)", 0.0, [460, 435, 455, 450], "背景光噪"),
    ("Control (0.1% DMSO)", 0.0, [184500, 186200, 183900, 187000], "无受试物对照，定为 100% 活力"),
    ("Compound X-402 (0.05 μM)", 0.05, [177500, 179100, 177800, 178400], "轻微影响 (96.1% 活力)"),
    ("Compound X-402 (0.50 μM)", 0.50, [142000, 143500, 141800, 143100], "中等抑制 (76.9% 活力)"),
    ("Compound X-402 (5.00 μM)", 5.00, [88100, 89200, 87800, 88500], "半数抑制窗口 (47.5% 活力)"),
    ("Compound X-402 (25.00 μM)", 25.00, [32500, 33200, 32100, 33400], "强抑制区 (17.5% 活力)"),
    ("Compound X-402 (100.00 μM)", 100.00, [5150, 5320, 5080, 5250], "完全抑制作用 (2.6% 活力)")
]

atp_blank_mean = sum(raw_atp_rows[0][2]) / len(raw_atp_rows[0][2])
atp_control_net = (sum(raw_atp_rows[1][2]) / len(raw_atp_rows[1][2])) - atp_blank_mean

atp_processed = []
for group, conc, reps, note in raw_atp_rows:
    m_rlu, sd_rlu, cv_rlu = calc_stats(reps)
    net_rlu = m_rlu - atp_blank_mean if "Blank" not in group else 0.0
    viab = (net_rlu / atp_control_net * 100.0) if "Blank" not in group else 0.0
    sb_ratio = (m_rlu / atp_blank_mean) if atp_blank_mean > 0 else 0.0
    
    row = [
        group,
        f"{conc:.2f}" if conc > 0 else "-",
        str(reps[0]), str(reps[1]), str(reps[2]), str(reps[3]),
        f"{m_rlu:.1f}",
        f"{net_rlu:.1f}",
        f"{viab:.2f}%" if "Blank" not in group else "-",
        f"{sd_rlu:.1f}",
        f"{cv_rlu:.2f}%",
        f"{sb_ratio:.1f}",
        note
    ]
    atp_processed.append(row)

# Function to save CSV with UTF-8 BOM
def save_csv(filepath, header, rows):
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)
    print(f"Saved CSV: {filepath}")

# Write CSV files
files_map = [
    ("01_CCK8_Dose_Response_Pilot.csv", cck8_header, cck8_processed),
    ("02_Cell_Density_Time_Optimization.csv", density_header, density_data),
    ("03_Live_Dead_Fluorescence_Assay.csv", livedead_header, livedead_processed),
    ("04_CellTiter_Glo_ATP_Bioluminescence.csv", atp_header, atp_processed)
]

for filename, head, data in files_map:
    ws_path = os.path.join(workspace_dir, filename)
    save_csv(ws_path, head, data)

# ==========================================
# Generate Excel XML Spreadsheet (.xls)
# ==========================================
def generate_excel_xml(filepath, sheets):
    xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_str += '<?mso-application progid="Excel.Sheet"?>\n'
    xml_str += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n'
    xml_str += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n'
    xml_str += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n'
    xml_str += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n'
    xml_str += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n'
    
    # Styles
    xml_str += ' <Styles>\n'
    xml_str += '  <Style ss:ID="Default" ss:Name="Normal">\n'
    xml_str += '   <Alignment ss:Vertical="Center"/>\n'
    xml_str += '   <Font ss:FontName="Microsoft YaHei" x:CharSet="134" ss:Size="10" ss:Color="#333333"/>\n'
    xml_str += '   <Interior/>\n'
    xml_str += '   <Borders/>\n'
    xml_str += '  </Style>\n'
    # Header Style
    xml_str += '  <Style ss:ID="HeaderStyle">\n'
    xml_str += '   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>\n'
    xml_str += '   <Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>\n'
    xml_str += '   <Interior ss:Color="#1F497D" ss:Pattern="Solid"/>\n'
    xml_str += '   <Borders>\n'
    xml_str += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/>\n'
    xml_str += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/>\n'
    xml_str += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/>\n'
    xml_str += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/>\n'
    xml_str += '   </Borders>\n'
    xml_str += '  </Style>\n'
    # Data Row Style
    xml_str += '  <Style ss:ID="DataStyle">\n'
    xml_str += '   <Alignment ss:Vertical="Center"/>\n'
    xml_str += '   <Font ss:FontName="Microsoft YaHei" ss:Size="10"/>\n'
    xml_str += '   <Borders>\n'
    xml_str += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>\n'
    xml_str += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>\n'
    xml_str += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>\n'
    xml_str += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>\n'
    xml_str += '   </Borders>\n'
    xml_str += '  </Style>\n'
    # Highlight Style
    xml_str += '  <Style ss:ID="HighlightStyle">\n'
    xml_str += '   <Alignment ss:Vertical="Center"/>\n'
    xml_str += '   <Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#9C0006" ss:Bold="1"/>\n'
    xml_str += '   <Interior ss:Color="#FFC7CE" ss:Pattern="Solid"/>\n'
    xml_str += '   <Borders>\n'
    xml_str += '    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>\n'
    xml_str += '    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>\n'
    xml_str += '    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>\n'
    xml_str += '    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>\n'
    xml_str += '   </Borders>\n'
    xml_str += '  </Style>\n'
    xml_str += ' </Styles>\n'
    
    for sheet_name, headers, rows in sheets:
        xml_str += f' <Worksheet ss:Name="{sheet_name}">\n'
        xml_str += '  <Table>\n'
        for _ in headers:
            xml_str += '   <Column ss:AutoFitWidth="1" ss:Width="130"/>\n'
        # Header Row
        xml_str += '   <Row ss:Height="26">\n'
        for cell_val in headers:
            xml_str += f'    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">{cell_val}</Data></Cell>\n'
        xml_str += '   </Row>\n'
        # Data Rows
        for row in rows:
            xml_str += '   <Row ss:Height="22">\n'
            for cell_val in row:
                style = "DataStyle"
                if "【首选推荐】" in str(cell_val) or "接近预计 IC50" in str(cell_val):
                    style = "HighlightStyle"
                
                val_clean = str(cell_val).replace("%", "").strip()
                try:
                    num = float(val_clean)
                    if "%" in str(cell_val):
                        xml_str += f'    <Cell ss:StyleID="{style}"><Data ss:Type="String">{cell_val}</Data></Cell>\n'
                    else:
                        xml_str += f'    <Cell ss:StyleID="{style}"><Data ss:Type="Number">{num}</Data></Cell>\n'
                except ValueError:
                    xml_str += f'    <Cell ss:StyleID="{style}"><Data ss:Type="String">{cell_val}</Data></Cell>\n'
            xml_str += '   </Row>\n'
        xml_str += '  </Table>\n'
        xml_str += ' </Worksheet>\n'
    
    xml_str += '</Workbook>\n'
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(xml_str)
    print(f"Saved Excel Workbook XML: {filepath}")

# Generate multi-sheet workbook
excel_sheets = [
    ("CCK-8剂量反应预实验", cck8_header, cck8_processed),
    ("接种密度与时间优化", density_header, density_data),
    ("Calcein-AM_PI活死双染", livedead_header, livedead_processed),
    ("CellTiter-Glo_ATP发光法", atp_header, atp_processed)
]

excel_ws = os.path.join(workspace_dir, "细胞活力预实验全套数据表_Scientific_Cell_Viability_Pilot_Dataset.xls")
generate_excel_xml(excel_ws, excel_sheets)

print("All table files successfully generated in workspace!")
