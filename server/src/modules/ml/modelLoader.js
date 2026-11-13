import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { RandomForestClassifier } from 'ml-random-forest'
const __dirname=path.dirname(fileURLToPath(import.meta.url))
const MODEL_PATH=path.resolve(__dirname,'data/randomForestModel.json')
const METRICS_PATH=path.resolve(__dirname,'data/trainingMetrics.json')
let _c=null,_m=null,_a=false
export const loadModel=()=>{if(_a)return _c;_a=true;if(!fs.existsSync(MODEL_PATH)){console.warn('[ML] No model. Run `npm run ml:train`.');return null}try{_c=RandomForestClassifier.load(JSON.parse(fs.readFileSync(MODEL_PATH,'utf-8')));if(fs.existsSync(METRICS_PATH)){_m=JSON.parse(fs.readFileSync(METRICS_PATH,'utf-8'));console.log(`[ML] Model loaded — Accuracy: ${(_m.testMetrics.accuracy*100).toFixed(2)}%`)}return _c}catch(e){console.error('[ML] Failed:',e.message);return null}}
export const getModel=()=>_c
export const getMetrics=()=>_m
