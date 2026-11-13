import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { RandomForestClassifier } from 'ml-random-forest'
import { generateSyntheticDataset } from './syntheticDataGenerator.js'
import { FEATURE_NAMES } from './featureEngineering.js'
const __dirname=path.dirname(fileURLToPath(import.meta.url))
const MODEL_PATH=path.resolve(__dirname,'data/randomForestModel.json')
const METRICS_PATH=path.resolve(__dirname,'data/trainingMetrics.json')
const split=(f,l,r)=>{const n=f.length,idx=Array.from({length:n},(_,i)=>i);let s=7;const sr=()=>{s=(s*9301+49297)%233280;return s/233280};for(let i=idx.length-1;i>0;i--){const j=Math.floor(sr()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]};const sp=Math.floor(n*r);return{xTrain:idx.slice(0,sp).map((i)=>f[i]),yTrain:idx.slice(0,sp).map((i)=>l[i]),xTest:idx.slice(sp).map((i)=>f[i]),yTest:idx.slice(sp).map((i)=>l[i])}}
const metrics=(yt,yp)=>{let tp=0,tn=0,fp=0,fn=0;for(let i=0;i<yt.length;i++){if(yt[i]===1&&yp[i]===1)tp++;else if(yt[i]===0&&yp[i]===0)tn++;else if(yt[i]===0&&yp[i]===1)fp++;else fn++};const a=(tp+tn)/yt.length,p=tp+fp===0?0:tp/(tp+fp),r=tp+fn===0?0:tp/(tp+fn),f1=p+r===0?0:(2*p*r)/(p+r);return{accuracy:Math.round(a*10000)/10000,precision:Math.round(p*10000)/10000,recall:Math.round(r*10000)/10000,f1Score:Math.round(f1*10000)/10000,confusionMatrix:{truePositive:tp,trueNegative:tn,falsePositive:fp,falseNegative:fn}}}
const run=async()=>{
    console.log('--- MICROLAUNCH Random Forest Training ---')
    const start=Date.now()
    console.log('1. Generating dataset...')
    const{features,labels,meta}=generateSyntheticDataset({count:1500,seed:42})
    console.log(`   ${meta.totalRecords} records | +${meta.positiveCount} / -${meta.negativeCount}`)
    console.log('2. Injecting label noise and splitting...')
    const nl=[...labels];let ns=999;const nr=()=>{ns=(ns*9301+49297)%233280;return ns/233280};let fl=0;for(let i=0;i<nl.length;i++){if(nr()<0.15){nl[i]=nl[i]===1?0:1;fl++}};console.log(`   Flipped ${fl} labels`)
    const{xTrain,yTrain,xTest,yTest}=split(features,nl,0.8);console.log(`   Train: ${xTrain.length} | Test: ${xTest.length}`)
    console.log('3. Training...')
    const t0=Date.now();const opts={seed:42,maxFeatures:0.5,replacement:true,nEstimators:50,minNumSamples:5};const clf=new RandomForestClassifier(opts);clf.train(xTrain,yTrain);console.log(`   Done in ${Date.now()-t0}ms`)
    console.log('4. Evaluating...')
    const tm=metrics(yTest,clf.predict(xTest));const trm=metrics(yTrain,clf.predict(xTrain))
    console.log(`   Accuracy: ${(tm.accuracy*100).toFixed(2)}% | Precision: ${(tm.precision*100).toFixed(2)}% | Recall: ${(tm.recall*100).toFixed(2)}% | F1: ${(tm.f1Score*100).toFixed(2)}%`)
    console.log('5. Saving...')
    fs.mkdirSync(path.dirname(MODEL_PATH),{recursive:true});fs.writeFileSync(MODEL_PATH,JSON.stringify(clf.toJSON()));fs.writeFileSync(METRICS_PATH,JSON.stringify({trainedAt:new Date().toISOString(),totalTrainingTimeMs:Date.now()-start,hyperparameters:opts,featureNames:FEATURE_NAMES,dataset:meta,split:{trainSize:xTrain.length,testSize:xTest.length},testMetrics:tm,trainMetrics:trm},null,2))
    console.log(`   Model: ${MODEL_PATH}\n--- Training complete ---`)
}
run().catch((e)=>{console.error(e);process.exit(1)})
