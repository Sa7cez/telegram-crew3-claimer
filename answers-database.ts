import { GoogleSpreadsheet } from 'google-spreadsheet'
import creds from './google.json'

const URL = process.env.ANSWERS || 'https://docs.google.com/spreadsheets/d/1Dk4qG6d7kjeK_iFbmxJ8Z2gGQRHZ_lsgdqwLiUxXMlg/edit#gid=0'
const googleRegex = /\/([\w-_]{15,})\/(.*?gid=(\d+))?/

// Write quest answers to Google Spreadsheet
export const writeAnswers = async (data, url = URL) => {
  if (data.answers.length === 0) return url
  const doc = new GoogleSpreadsheet(googleRegex.exec(url)[1])
  await doc.useServiceAccountAuth(JSON.parse(atob(creds['google'])))
  await doc.loadInfo()

  let existed = []
  let sheet = await doc.sheetsByTitle[data.community] || null

  if (!sheet || typeof sheet === undefined) {
    sheet = await doc.addSheet({ title: data.community, headers: ['question', 'answer'] })
    await sheet.updateDimensionProperties('COLUMNS', { pixelSize: 300 }, {startIndex: 0, endIndex: 1 } )
    await sheet.updateDimensionProperties('COLUMNS', { pixelSize: 1000 }, {startIndex: 1, endIndex: 2 } )
  } else {
    existed = (await sheet.getRows()).map(row => ({ question: row.question, answer: row.answer }))
    await sheet.clearRows()
  }

  console.log('Write new answers for community:', data.community)

  const answers = [
    ...new Set(existed),
    ...new Set(data.answers)
  ].filter((v,i,a)=>a.findIndex(v2=>(JSON.stringify(v2) === JSON.stringify(v)))===i)
   .sort((a, b) => a.question.localeCompare(b.question))

  await sheet.addRows(answers)
    .catch(e => console.log(e.response.data.error))

  return url
}

// Read quest answers from Google Spreadsheet
export const readAnswers = async (url = URL) => {
  const doc = new GoogleSpreadsheet(googleRegex.exec(url)[1])
  await doc.useServiceAccountAuth(JSON.parse(atob(creds['google'])))
  await doc.loadInfo()

  let answers = {}
  for (let i = 0; i < doc.sheetCount; i++) {
    let sheet = await doc.sheetsByIndex[i]
    answers[sheet.title] = {}
    const rows = await sheet.getRows()
    for(const row of rows) {
      answers[sheet.title][row.question] = row.answer
    }
  }
  return answers
}

const checkConnection = async () => {
  try {
    const answers = await readAnswers()
    console.log(`Google OK. Database communities: ${Object.keys(answers).join(' | ')}`)
  } catch (e) {
    console.log(`Google connection error! Please check provided URL visability or use default URL.`)
  }
}

checkConnection()