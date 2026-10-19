// utils/tallyXml.js
// Compatible with TallyPrime 4.x, 5.x, 6.x, 7.x
// Uses standard ODBC/HTTP XML format which hasn't changed since TallyPrime 3.0

const COMPANY_INFO = {
  name: "PayTel Financial Technologies Pvt. Ltd.(Delhi)",
  gstin: "07AALCP3083C1ZH",
  state: "Delhi",
  stateCode: "07",
};

const SERVICE_NAMES = {
  ERP_ON_CLOUD: "ERP On Cloud",
  CTRLBOOKS: "CTRLBOOKS",
  FAIRWOOD: "Fairwood",
};

const SERVICE_HSN = {
  ERP_ON_CLOUD: "998315",
  CTRLBOOKS: "998315",
  FAIRWOOD: "998315",
};

const GST_RATE = 18;

const toTallyDate = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const escapeXML = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const generateTallyXML = (bill, client) => {
  const baseAmount = parseFloat(bill.amount) || 0;
  const gstAmount = parseFloat(((baseAmount * GST_RATE) / 100).toFixed(2));
  const totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2));
  const roundedTotal = Math.round(totalAmount);
  const roundOff = parseFloat((roundedTotal - totalAmount).toFixed(2));

  const serviceName = SERVICE_NAMES[bill.service] || bill.service;
  const hsnCode = SERVICE_HSN[bill.service] || "998315";
  const tallyDate = toTallyDate(bill.billingDate);

  // Build narration from specifications
  const narration = [
    `Invoice: ${bill.billNumber}`,
    `Service: ${serviceName}`,
    ...bill.specifications
      .filter((s) => s.value && s.key.toLowerCase() !== "amount")
      .map((s) => `${s.key}: ${s.value}`),
  ].join(" | ");

  // Ledger names — these must exist in Tally before import
  // Accountant needs to create these once
  const LEDGER = {
    party: escapeXML(client.companyName), // Sundry Debtors group
    sales: escapeXML(serviceName), // Sales Accounts group
    igst: `IGST @ ${GST_RATE}%`, // Duties & Taxes group
    roundOff: "Round Off", // Indirect Expenses group
  };

  // Round off entry (only if non-zero)
  const roundOffEntry =
    roundOff !== 0
      ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${LEDGER.roundOff}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${roundOff < 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>${roundOff < 0 ? "Yes" : "No"}</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>${roundOff < 0 ? "" : "-"}${Math.abs(roundOff).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>##SVCURRENTCOMPANY</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">

          <!-- ══ PARTY LEDGER (create if not exists) ══ -->
          <LEDGER NAME="${LEDGER.party}" RESERVEDNAME="">
            <PARENT>Sundry Debtors</PARENT>
            <TAXCLASSIFICATIONNAME/>
            <TAXTYPE>Others</TAXTYPE>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
            <PARTYGSTIN>${escapeXML(client.gstNumber || "")}</PARTYGSTIN>
            <STATENAME>${escapeXML(client.state || "Delhi")}</STATENAME>
            <COUNTRYNAME>India</COUNTRYNAME>
            <MAILINGNAME>${LEDGER.party}</MAILINGNAME>
            <MAILINGADDRESS>${escapeXML(client.address || "")}</MAILINGADDRESS>
            <PINCODE/>
            <EMAILID>${escapeXML(client.email || "")}</EMAILID>
            <CONTACTNUMBERS>${escapeXML(client.phone || "")}</CONTACTNUMBERS>
          </LEDGER>

          <!-- ══ SALES VOUCHER ══ -->
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">

            <!-- Basic Info -->
            <DATE>${tallyDate}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXML(bill.billNumber)}</VOUCHERNUMBER>
            <REFERENCE>${escapeXML(bill.billNumber)}</REFERENCE>
            <NARRATION>${escapeXML(narration)}</NARRATION>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <VCHGSTCLASS/>
            <DIFFACTUALQTY>No</DIFFACTUALQTY>
            <ISMSTFROMSYNC>No</ISMSTFROMSYNC>
            <ASORIGINAL>Yes</ASORIGINAL>
            <AUDITED>No</AUDITED>
            <FORJOBCOSTING>No</FORJOBCOSTING>
            <ISOPTIONAL>No</ISOPTIONAL>
            <USEFORINTEREST>No</USEFORINTEREST>
            <USEFORGAINLOSS>No</USEFORGAINLOSS>
            <USEFORGODOWNTRANSFER>No</USEFORGODOWNTRANSFER>
            <USEFORCOMPOUND>No</USEFORCOMPOUND>
            <USEFORSERVICETAX>No</USEFORSERVICETAX>
            <ISEXCISEVOUCHER>No</ISEXCISEVOUCHER>
            <EXCISETAXOVERRIDE>No</EXCISETAXOVERRIDE>
            <USEFORTAXUNITTRANSFER>No</USEFORTAXUNITTRANSFER>
            <IGNOREPOSVALIDATION>No</IGNOREPOSVALIDATION>
            <EXCISEOPENING>No</EXCISEOPENING>
            <USEFORFINALPRODUCTION>No</USEFORFINALPRODUCTION>
            <ISTDSOVERRIDDEN>No</ISTDSOVERRIDDEN>
            <ISTCSOVERRIDDEN>No</ISTCSOVERRIDDEN>
            <ISTDSTAXAUDITED>No</ISTDSTAXAUDITED>
            <ISESCHEQUE>No</ISESCHEQUE>
            <ISFINANCIALLYYEAR>No</ISFINANCIALLYYEAR>
            <ISDELETED>No</ISDELETED>
            <ISSECURITYONWHENENTERED>No</ISSECURITYONWHENENTERED>
            <ISPOSTDATED>No</ISPOSTDATED>
            <USETRACKINGNUMBER>No</USETRACKINGNUMBER>
            <ISINVOICE>Yes</ISINVOICE>
            <MFGJOURNAL>No</MFGJOURNAL>
            <HASDISCOUNTS>No</HASDISCOUNTS>
            <ASPAYSLIP>No</ASPAYSLIP>
            <ISCOSTCENTRE>No</ISCOSTCENTRE>
            <ISSTXNONREALIZEDVCH>No</ISSTXNONREALIZEDVCH>
            <ISEXCISEMANUFACTURERON>No</ISEXCISEMANUFACTURERON>
            <ISBLANKCHEQUE>No</ISBLANKCHEQUE>
            <ISVOID>No</ISVOID>
            <ORDERDUE>No</ORDERDUE>
            <VATISAGNSTCANCSALES>No</VATISAGNSTCANCSALES>
            <ISVATRESTAXINVOICE>No</ISVATRESTAXINVOICE>
            <VATISINTERSTATE>Yes</VATISINTERSTATE>
            <ISDELETED>No</ISDELETED>

            <!-- Party Details -->
            <PARTYLEDGERNAME>${LEDGER.party}</PARTYLEDGERNAME>
            <BASICBASEPARTYNAME>${LEDGER.party}</BASICBASEPARTYNAME>
            <CSTFORMISSUETYPE/>
            <CSTFORMRECVTYPE/>
            <FBTPAYMENTTYPE>Default</FBTPAYMENTTYPE>
            <BASICBUYERNAME>${LEDGER.party}</BASICBUYERNAME>
            <BASICBUYERADDRESS>
              <BASICBUYERADDRESS.LIST TYPE="String">
                <BASICBUYERADDRESS>${escapeXML(client.address || "")}</BASICBUYERADDRESS>
              </BASICBUYERADDRESS.LIST>
            </BASICBUYERADDRESS>
            <PARTYGSTIN>${escapeXML(client.gstNumber || "")}</PARTYGSTIN>
            <BASICBUYERGSTIN>${escapeXML(client.gstNumber || "")}</BASICBUYERGSTIN>
            <BASICBUYERSTATE>${escapeXML(client.state || "Delhi")}</BASICBUYERSTATE>
            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
            <PLACEOFSUPPLY>${escapeXML(client.state || "Delhi")}</PLACEOFSUPPLY>
            <COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>
            <CONSIGNEEGSTIN>${escapeXML(client.gstNumber || "")}</CONSIGNEEGSTIN>
            <SELLERGSTIN>${escapeXML(COMPANY_INFO.gstin)}</SELLERGSTIN>
            <BASICSELLERGSTIN>${escapeXML(COMPANY_INFO.gstin)}</BASICSELLERGSTIN>
            <GSTINOFPARTY>${escapeXML(client.gstNumber || "")}</GSTINOFPARTY>

            <!-- ── Ledger Entries ── -->

            <!-- 1. Party (Debtor) — total amount (negative = debit in Tally) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${LEDGER.party}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>-${roundedTotal.toFixed(2)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${escapeXML(bill.billNumber)}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <TRNTYPE>Sales</TRNTYPE>
                <AMOUNT>-${roundedTotal.toFixed(2)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </ALLLEDGERENTRIES.LIST>

            <!-- 2. Sales Ledger — base amount -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${LEDGER.sales}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>${baseAmount.toFixed(2)}</AMOUNT>
              <VATASSESSABLEVALUE CURRENCYNAME="INR">${baseAmount.toFixed(2)}</VATASSESSABLEVALUE>
              <GSTTAXCLASSIFICATIONNAME/>
              <GSTOVRDNASSESSABLEVALUE>${baseAmount.toFixed(2)}</GSTOVRDNASSESSABLEVALUE>
              <GSTSECTIONTOSET/>
              <HSNCODE>${hsnCode}</HSNCODE>
              <TAXCLASSIFICATIONNAME/>
              <TAXOBJECTALLOCATIONS.LIST/>
              <STPAIDTAXATIONS.LIST/>
              <STCALCULATEDTAXATIONS.LIST/>
            </ALLLEDGERENTRIES.LIST>

            <!-- 3. IGST @ 18% -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${LEDGER.igst}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>
              <AMOUNT>${gstAmount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- 4. Round Off (if any) -->
            ${roundOffEntry}

          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
};

module.exports = { generateTallyXML };
