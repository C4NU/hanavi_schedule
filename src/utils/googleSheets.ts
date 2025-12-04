import { google } from 'googleapis';
import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';
import path from 'path';
import process from 'process';

// Environment variables
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// Scopes
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

async function getAuth() {
    // 1. Try using environment variables (Vercel / Production)
    if (CLIENT_EMAIL && PRIVATE_KEY) {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: CLIENT_EMAIL,
                private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: SCOPES,
        });
        return await auth.getClient();
    }

    // 2. Try using secrets.json (Local Development)
    try {
        const keyFile = path.join(process.cwd(), 'secrets.json');
        const auth = new google.auth.GoogleAuth({
            keyFile: keyFile,
            scopes: SCOPES,
        });
        return await auth.getClient();
    } catch (error) {
        console.error('Failed to load credentials from secrets.json', error);
        return null;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseProfileSheetWithHyperlinks(rowData: any[] | undefined): CharacterSchedule[] {
    if (!rowData || rowData.length < 2) return []; // No data or just header

    const characters: CharacterSchedule[] = [];
    // Assume Header: ID, Name, Theme, Avatar URL, Chzzk URL
    // Skip header row (index 0)
    for (let i = 1; i < rowData.length; i++) {
        const row = rowData[i];
        const values = row.values;
        if (!values || !values[0]) continue; // Skip empty row or ID

        // Helper to get text or hyperlink
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getCellData = (cell: any) => {
            if (!cell) return '';
            // Priority: Hyperlink -> Formatted Value -> User Entered Value
            return cell.hyperlink || cell.formattedValue || cell.userEnteredValue?.stringValue || '';
        };

        const id = getCellData(values[0]).trim();
        if (!id) continue;

        characters.push({
            id: id,
            name: getCellData(values[1]).trim(),
            colorTheme: (getCellData(values[2]).trim() || 'varessa') as CharacterSchedule['colorTheme'],
            avatarUrl: getCellData(values[3]).trim(),
            chzzkUrl: getCellData(values[4]).trim(),
            schedule: {
                MON: { time: '', content: '휴방', type: 'off' },
                TUE: { time: '', content: '휴방', type: 'off' },
                WED: { time: '', content: '휴방', type: 'off' },
                THU: { time: '', content: '휴방', type: 'off' },
                FRI: { time: '', content: '휴방', type: 'off' },
                SAT: { time: '', content: '휴방', type: 'off' },
                SUN: { time: '', content: '휴방', type: 'off' },
            }
        });
    }
    return characters;
}

function parseScheduleSheet(rows: string[][] | undefined | null, characters: CharacterSchedule[]): { weekRange: string } {
    if (!rows || rows.length === 0) return { weekRange: '' };

    let weekRange = '';

    // 1. Parse Metadata (Row 1)
    if (rows[0] && rows[0][0] === 'weekRange') {
        weekRange = rows[0][1] || '';
    }

    // 2. Parse Schedule Data (Start from Row 4, index 3)
    // Header is at Row 3 (index 2): characterId, weekday, time, title, entryType
    const startIndex = 3;

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0]) continue; // Skip empty characterId

        const charId = row[0].trim();
        const weekday = row[1]?.trim().toUpperCase();
        const time = row[2]?.trim() || '';
        const title = row[3]?.trim() || '';
        const entryType = row[4]?.trim().toLowerCase() || '';

        const character = characters.find(c => c.id === charId);
        if (character && weekday && ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].includes(weekday)) {
            let type: 'stream' | 'collab' | 'collab_maivi' | 'collab_hanavi' | 'collab_universe' | 'off' = 'stream';

            if (entryType === 'off') {
                type = 'off';
            } else if (entryType === 'collab_maivi') {
                type = 'collab_maivi';
            } else if (entryType === 'collab_hanavi') {
                type = 'collab_hanavi';
            } else if (entryType === 'collab_universe') {
                type = 'collab_universe';
            } else if (entryType.includes('collab')) {
                type = 'collab';
            }

            // If type is off, ensure content says '휴방' if empty, or use title if provided
            const content = type === 'off' ? (title || '휴방') : title;

            character.schedule[weekday as keyof typeof character.schedule] = {
                time,
                content,
                type
            };
        }
    }

    return { weekRange };
}

export async function getScheduleFromSheet(): Promise<WeeklySchedule | null> {
    if (!SHEET_ID) {
        console.error('GOOGLE_SHEET_ID is not defined');
        return null;
    }

    console.log('Fetching schedule from Google Sheet...');

    const auth = await getAuth();
    if (!auth) {
        console.error('Failed to authenticate with Google Sheets API');
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sheets = google.sheets({ version: 'v4', auth: auth as any });

    try {
        // 1. Get the spreadsheet metadata to find sheet names
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId: SHEET_ID,
        });

        const sheetList = metadata.data.sheets;
        if (!sheetList || sheetList.length === 0) {
            console.error('No sheets found in the spreadsheet');
            return null;
        }

        // Find specific sheets by name
        const profileSheet = sheetList.find(s => s.properties?.title === '프로필 정보');
        // Assume the other one is schedule, or look for '방송 스케줄'
        const scheduleSheet = sheetList.find(s => s.properties?.title?.includes('방송 스케줄')) || sheetList[0];

        // 2. Fetch Profile Data (using spreadsheets.get to retrieve hyperlinks)
        let characters: CharacterSchedule[] = [];
        if (profileSheet && profileSheet.properties?.title) {
            // We need includeGridData: true to get hyperlinks
            const profileResponse = await sheets.spreadsheets.get({
                spreadsheetId: SHEET_ID,
                ranges: [`${profileSheet.properties.title}!A:E`], // ID, Name, Theme, Avatar URL, Chzzk URL
                includeGridData: true,
            });

            const sheetData = profileResponse.data.sheets?.[0]?.data?.[0]?.rowData;
            characters = parseProfileSheetWithHyperlinks(sheetData);
        } else {
            console.warn("'프로필 정보' sheet not found, using default/empty characters");
        }

        // 3. Fetch Schedule Data
        let weekRange = '';
        if (scheduleSheet && scheduleSheet.properties?.title) {
            const scheduleResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: `${scheduleSheet.properties.title}!A:E`, // weekRange at top, then data columns
            });
            const scheduleData = parseScheduleSheet(scheduleResponse.data.values, characters);
            weekRange = scheduleData.weekRange;
            // Characters are updated in-place within parseScheduleSheet
        }

        return {
            weekRange: weekRange || '날짜 미정',
            characters
        };

    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        return null;
    }
}
