import bcrypt from 'bcrypt'
import '../configs/load-env.js'
import { dbConnection } from '../configs/db.config.js'
import mongoose from 'mongoose'
import Role from '../modules/auth/models/role.model.js'
import User from '../modules/auth/models/user.model.js'
const EMAIL=process.env.SEED_ADMIN_EMAIL||'admin@microlaunch.local'
const PASSWORD=process.env.SEED_ADMIN_PASSWORD||'Admin12345!'
const isRemoteDb=!/(127\.0\.0\.1|localhost)/.test(process.env.DATABASE_URL||'')
if((process.env.NODE_ENV==='production'||isRemoteDb)&&(!process.env.SEED_ADMIN_PASSWORD||process.env.SEED_ADMIN_PASSWORD.length<10||process.env.SEED_ADMIN_PASSWORD==='Admin12345!')){
    console.error('\n[SEED ABORTED] This database is not local, so the well-known default admin password is not allowed.\nSet SEED_ADMIN_PASSWORD (10+ characters) and SEED_ADMIN_EMAIL, then run again.\n');process.exit(1)}
const run=async()=>{
    await dbConnection()
    for(const role of [{name:'ADMIN',description:'Full platform administrative access.'},{name:'USER',description:'Side-hustler account.'}])
        await Role.findOneAndUpdate({name:role.name},{$setOnInsert:role},{upsert:true,new:true})
    console.log('Roles ensured: ADMIN, USER')
    const adminRole=await Role.findOne({name:'ADMIN'})
    if(await User.findOne({email:EMAIL})){console.log(`Admin already exists: ${EMAIL}`)}
    else{await User.create({name:'MICROLAUNCH Admin',email:EMAIL,password:await bcrypt.hash(PASSWORD,await bcrypt.genSalt(10)),roleId:adminRole._id,hasCompletedProfile:true,isEmailVerified:true});console.log(`Admin created:\n  email: ${EMAIL}\n  password: ${PASSWORD}`)}
    await mongoose.disconnect();process.exit(0)
}
run().catch((e)=>{console.error(e);process.exit(1)})
