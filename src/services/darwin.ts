interface DepartureBoard {
  locationName: string;
  crs: string;
  services?: Service[];
}

interface Service {
  std: string; // scheduled time of departure
  etd: string; // estimated time of departure
  platform?: string;
  operator: string;
  operatorCode: string;
  destination: Destination[];
}

interface Destination {
  locationName: string;
  crs: string;
}

const DARWIN_BASE_URL =
  "https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx";

const extractValue = (xml: string, tag: string): string | undefined => {
  const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
  return match ? match[1] : undefined;
};

const parseXmlResponse = (xmlText: string): DepartureBoard => {
  const locationNameMatch = xmlText.match(
    /<lt4:locationName>(.*?)<\/lt4:locationName>/
  );
  const crsMatch = xmlText.match(/<lt4:crs>(.*?)<\/lt4:crs>/);

  const locationName = locationNameMatch ? locationNameMatch[1] : "Unknown";
  const crs = crsMatch ? crsMatch[1] : "UNK";

  const servicesRegex = /<lt8:service>(.*?)<\/lt8:service>/g;
  const services: Service[] = [];

  let serviceMatch;
  while ((serviceMatch = servicesRegex.exec(xmlText)) !== null) {
    const serviceXml = serviceMatch[1];

    const std = extractValue(serviceXml, "lt4:std") || "";
    const etd = extractValue(serviceXml, "lt4:etd") || "";
    const platform = extractValue(serviceXml, "lt4:platform");
    const operator = extractValue(serviceXml, "lt4:operator") || "";
    const operatorCode = extractValue(serviceXml, "lt4:operatorCode") || "";

    const destinationsRegex = /<lt5:destination>(.*?)<\/lt5:destination>/g;
    const destinations: Destination[] = [];

    let destMatch;
    while ((destMatch = destinationsRegex.exec(serviceXml)) !== null) {
      const destXml = destMatch[1];
      const destName = extractValue(destXml, "lt4:locationName") || "";
      const destCrs = extractValue(destXml, "lt4:crs") || "";

      destinations.push({
        locationName: destName,
        crs: destCrs,
      });
    }

    services.push({
      std,
      etd,
      platform,
      operator,
      operatorCode,
      destination: destinations,
    });
  }

  return {
    locationName,
    crs,
    services,
  };
};

export const getDepartureBoard = async (
  stationCode: string,
  numRows: number = 10
): Promise<DepartureBoard> => {
  const token = process.env.DARWIN_TOKEN;

  const capitalisedStationCode = stationCode.toUpperCase();

  if (!token) {
    throw new Error("Darwin API token not configured");
  }

  console.log("Darwin token present:", !!token);
  console.log("Token length:", token.length);
  console.log(
    "Making request to Darwin API for station:",
    capitalisedStationCode
  );

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ldb="http://thalesgroup.com/RTTI/2021-11-01/ldb/" xmlns:typ="http://thalesgroup.com/RTTI/2013-11-28/Token/types">
  <soap:Header>
    <typ:AccessToken>
      <typ:TokenValue>${token}</typ:TokenValue>
    </typ:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepartureBoardRequest>
      <ldb:numRows>${numRows}</ldb:numRows>
      <ldb:crs>${capitalisedStationCode}</ldb:crs>
    </ldb:GetDepartureBoardRequest>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(DARWIN_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction:
        "http://thalesgroup.com/RTTI/2012-01-13/ldb/GetDepartureBoard",
    },
    body: soapEnvelope,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Darwin API error response:", errorText);
    throw new Error(`Darwin API error: ${response.status}`);
  }

  const xmlText = await response.text();

  console.log("Raw XML response from Darwin API:", xmlText);
  
  const parsed = parseXmlResponse(xmlText);
  console.log("Parsed response:", parsed);
  
  return parsed;
};
