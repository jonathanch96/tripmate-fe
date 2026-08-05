import "server-only"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { camelize, decamelize } from "@/lib/case"
import { authenticatedBackendFetch } from "@/lib/server/authenticated-backend"
export async function authenticatedProxy(request:NextRequest,path:string){try{const hasBody=!(["GET","HEAD","DELETE"].includes(request.method));const value=hasBody?await request.json().catch(()=>undefined):undefined;const{envelope,status}=await authenticatedBackendFetch(request,path,{method:request.method,requestId:request.headers.get("X-Request-ID")??undefined,body:value===undefined?undefined:JSON.stringify(decamelize(value))});return NextResponse.json(camelize(envelope),{status})}catch{return NextResponse.json({success:false,code:"UNAUTHENTICATED",message:"Authentication is required",data:null,meta:{},errors:[]},{status:401})}}
