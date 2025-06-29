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

export class DarwinService {
  private readonly baseUrl =
    "https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx";
  private readonly username = process.env.DARWIN_USERNAME;
  private readonly password = process.env.DARWIN_PASSWORD;

  async getDepartureBoard(
    stationCode: string,
    numRows: number = 10
  ): Promise<DepartureBoard> {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/">
  <soap:Header>
    <ldb:AccessToken>
      <ldb:TokenValue>${this.username}:${this.password}</ldb:TokenValue>
    </ldb:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepartureBoardRequest>
      <ldb:numRows>${numRows}</ldb:numRows>
      <ldb:crs>${stationCode}</ldb:crs>
    </ldb:GetDepartureBoardRequest>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction:
          "http://thalesgroup.com/RTTI/2017-10-01/ldb/GetDepartureBoard",
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      console.log(response, response.status, response.statusText);
      throw new Error(`Darwin API error: ${response.status}`);
    }

    const xmlText = await response.text();
    return this.parseXmlResponse(xmlText);
  }

  private parseXmlResponse(xmlText: string): DepartureBoard {
    // Basic XML parsing - in production, use a proper XML parser
    const locationNameMatch = xmlText.match(
      /<lt4:locationName>(.*?)<\/lt4:locationName>/
    );
    const crsMatch = xmlText.match(/<lt4:crs>(.*?)<\/lt4:crs>/);

    const locationName = locationNameMatch ? locationNameMatch[1] : "Unknown";
    const crs = crsMatch ? crsMatch[1] : "UNK";

    // Extract services
    const servicesRegex = /<lt5:service>(.*?)<\/lt5:service>/g;
    const services: Service[] = [];

    let serviceMatch;
    while ((serviceMatch = servicesRegex.exec(xmlText)) !== null) {
      const serviceXml = serviceMatch[1];

      const std = this.extractValue(serviceXml, "lt5:std") || "";
      const etd = this.extractValue(serviceXml, "lt5:etd") || "";
      const platform = this.extractValue(serviceXml, "lt5:platform");
      const operator = this.extractValue(serviceXml, "lt5:operator") || "";
      const operatorCode =
        this.extractValue(serviceXml, "lt5:operatorCode") || "";

      // Extract destinations
      const destinationsRegex = /<lt5:destination>(.*?)<\/lt5:destination>/g;
      const destinations: Destination[] = [];

      let destMatch;
      while ((destMatch = destinationsRegex.exec(serviceXml)) !== null) {
        const destXml = destMatch[1];
        const destName = this.extractValue(destXml, "lt5:locationName") || "";
        const destCrs = this.extractValue(destXml, "lt5:crs") || "";

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
  }

  private extractValue(xml: string, tag: string): string | undefined {
    const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
    return match ? match[1] : undefined;
  }
}
