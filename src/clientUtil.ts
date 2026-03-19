import https from "node:https";
import axios from 'axios';

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

export class FlomoClient {
    private readonly apiUrl: string;

    constructor({ apiUrl }: { apiUrl: string }) {
        this.apiUrl = apiUrl;
    }

    async writeNote({ content }: { content: string }) {
        if (!content) {
            throw new Error('Content is required');
        }
        const body = new URLSearchParams({ content }).toString();
        const url = new URL(this.apiUrl);

        const result = await new Promise<{ statusCode: number; data: string }>((resolve, reject) => {
            const req = https.request(
                {
                    hostname: url.hostname,
                    path: url.pathname + url.search,
                    method: 'POST',
                    rejectUnauthorized: false,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(body),
                    },
                },
                (res) => {
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk: Buffer) => chunks.push(chunk));
                    res.on('end', () =>
                        resolve({
                            statusCode: res.statusCode ?? 0,
                            data: Buffer.concat(chunks).toString('utf8'),
                        }),
                    );
                },
            );
            req.on('error', reject);
            req.write(body);
            req.end();
        });

        if (result.statusCode < 200 || result.statusCode >= 300) {
            let detail = `HTTP ${result.statusCode}`;
            try {
                const json = JSON.parse(result.data);
                if (json.message) detail += `: ${json.message}`;
                else if (json.error) detail += `: ${json.error}`;
            } catch {
                if (result.data) detail += `: ${result.data.slice(0, 200)}`;
            }
            throw new Error(`Failed to write note (${detail})`);
        }
        try {
            return JSON.parse(result.data);
        } catch {
            return { ok: true };
        }
    }
}

export class WeatherClient {
    private readonly apiUrl: string;

    constructor({ apiUrl }: { apiUrl: string }) {
        this.apiUrl = apiUrl;
    }

    async getWeather({ city }: { city: string }) {
        if (!city) {
            throw new Error('City is required');
        }

    const { data } = await axiosInstance.get(this.apiUrl);

    const weatherData = {
        city,
        temp: data.current_weather.temperature + '°C',
        wind: data.current_weather.windspeed + 'km/h',
        time: new Date().toLocaleString()
    };

    return weatherData;
    }
}
