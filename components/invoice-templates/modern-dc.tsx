import { type DCData } from "./types";

const ACCENT = "#1A237E";
const ACCENT_LIGHT = "#E8EAF6";

export function ModernDC({ data }: { data: DCData }) {
  return (
    <div className="modern-dc bg-white text-black" style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", fontSize: "11px", lineHeight: 1.5 }}>
      {/* Header Bar */}
      <div style={{ backgroundColor: ACCENT, color: "#fff", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "6px 6px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>
            SSI
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "700", margin: 0, letterSpacing: "0.5px" }}>{data.seller.name}</h1>
            <p style={{ fontSize: "10px", margin: "2px 0 0", opacity: 0.8 }}>{data.seller.tagline}</p>
          </div>
        </div>
        <div style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: "6px 16px", borderRadius: "4px", fontSize: "13px", fontWeight: "700", letterSpacing: "1px" }}>
          DELIVERY CHALLAN
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px", border: "1px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 6px 6px" }}>
        {/* DC meta */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "24px", fontSize: "10.5px" }}>
            <div>
              <span style={{ color: "#999", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>DC No</span>
              <p style={{ fontWeight: "600", margin: "2px 0 0", fontSize: "12px", color: ACCENT }}>{data.dcNumber}</p>
            </div>
            <div>
              <span style={{ color: "#999", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</span>
              <p style={{ fontWeight: "600", margin: "2px 0 0" }}>{data.date}</p>
            </div>
            <div>
              <span style={{ color: "#999", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>PO Reference</span>
              <p style={{ fontWeight: "600", margin: "2px 0 0" }}>{data.poReference}</p>
            </div>
          </div>
        </div>

        {/* Consignor & Consignee Cards */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
          <div style={{ flex: 1, border: "1px solid #e0e0e0", borderRadius: "8px", padding: "12px 16px", backgroundColor: "#fafafa" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: ACCENT, letterSpacing: "0.5px", marginBottom: "6px" }}>Consignor</p>
            <p style={{ fontWeight: "700", fontSize: "12px" }}>{data.seller.name}</p>
            <p style={{ color: "#555" }}>{data.seller.address}</p>
            <p style={{ color: "#555" }}>{data.seller.city} - {data.seller.pincode}</p>
            <p style={{ color: "#555" }}>State: {data.seller.state} ({data.seller.stateCode})</p>
            <p style={{ marginTop: "4px" }}><strong>GSTIN:</strong> {data.seller.gstin}</p>
          </div>
          <div style={{ flex: 1, border: "1px solid #e0e0e0", borderRadius: "8px", padding: "12px 16px", backgroundColor: "#fafafa" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: ACCENT, letterSpacing: "0.5px", marginBottom: "6px" }}>Consignee</p>
            <p style={{ fontWeight: "700", fontSize: "12px" }}>{data.buyer.name}</p>
            <p style={{ color: "#555" }}>{data.buyer.division}</p>
            <p style={{ color: "#555" }}>{data.buyer.address}, {data.buyer.city}</p>
            <p style={{ color: "#555" }}>State: {data.buyer.state} ({data.buyer.stateCode})</p>
            <p style={{ marginTop: "4px" }}><strong>GSTIN:</strong> {data.buyer.gstin}</p>
          </div>
        </div>

        {/* Transport Details Box */}
        <div style={{ backgroundColor: ACCENT_LIGHT, border: `1px solid #C5CAE9`, borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", display: "flex", gap: "24px" }}>
          <div>
            <span style={{ fontSize: "9px", textTransform: "uppercase", color: ACCENT, fontWeight: "700", letterSpacing: "0.5px" }}>Vehicle Number</span>
            <p style={{ fontWeight: "600", marginTop: "2px" }}>{data.vehicleNumber || "—"}</p>
          </div>
          <div>
            <span style={{ fontSize: "9px", textTransform: "uppercase", color: ACCENT, fontWeight: "700", letterSpacing: "0.5px" }}>Transport Details</span>
            <p style={{ fontWeight: "600", marginTop: "2px" }}>{data.transportDetails || "By Road"}</p>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr>
              <th style={modDcThStyle({ width: "40px", textAlign: "center" })}>S.No</th>
              <th style={modDcThStyle({ width: "120px" })}>Part Number</th>
              <th style={modDcThStyle({})}>Description</th>
              <th style={modDcThStyle({ width: "100px" })}>Work Order</th>
              <th style={modDcThStyle({ width: "60px", textAlign: "right" })}>Qty</th>
              <th style={modDcThStyle({ width: "60px", textAlign: "center" })}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={item.sno} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8f9ff" }}>
                <td style={modDcTdStyle({ textAlign: "center" })}>{item.sno}</td>
                <td style={modDcTdStyle({ fontWeight: "600" })}>{item.partNumber}</td>
                <td style={modDcTdStyle({})}>{item.description}</td>
                <td style={modDcTdStyle({})}>{item.workOrder || "—"}</td>
                <td style={modDcTdStyle({ textAlign: "right", fontWeight: "600" })}>{item.qty}</td>
                <td style={modDcTdStyle({ textAlign: "center" })}>{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Remarks */}
        {data.remarks && (
          <div style={{ marginBottom: "16px", padding: "10px 14px", backgroundColor: "#fafafa", borderRadius: "6px", border: "1px solid #eee" }}>
            <p style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: "#999", marginBottom: "4px" }}>Remarks</p>
            <p style={{ fontSize: "10.5px", color: "#555" }}>{data.remarks}</p>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "10px", color: "#666", marginBottom: "44px" }}>Received in good condition</p>
            <div style={{ width: "180px", borderBottom: "1px dashed #ccc", marginBottom: "4px" }} />
            <p style={{ fontSize: "10px", color: "#999" }}>Receiver&apos;s Signature & Stamp</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "10px", fontWeight: "600", color: ACCENT, marginBottom: "40px" }}>For {data.seller.name}</p>
            <div style={{ width: "180px", borderBottom: "1px dashed #ccc", marginBottom: "4px" }} />
            <p style={{ fontSize: "10px", color: "#999" }}>Dispatched By (Authorized Signatory)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function modDcThStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "8px 8px",
    backgroundColor: ACCENT,
    color: "#fff",
    fontSize: "9px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    textAlign: "left",
    ...extra,
  } as React.CSSProperties;
}

function modDcTdStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "6px 8px",
    borderBottom: "1px solid #eee",
    fontSize: "10.5px",
    verticalAlign: "top",
    ...extra,
  } as React.CSSProperties;
}
