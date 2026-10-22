module.exports=async function setupGarage(){
  const request=async(name,body)=>{
    const response=await fetch('http://127.0.0.1:3903/v2/'+name,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.GARAGE_ADMIN_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error('Garage setup failed at '+name+' (HTTP '+response.status+')');
    return response.json();
  };
  const status=await request('GetClusterStatus');
  const node=status.nodes?.find(node=>node.isUp);
  if(!node)throw new Error('Garage has no available node');
  const layout=await request('GetClusterLayout');
  if(!layout.roles?.some(role=>role.id===node.id&&role.capacity)){
    await request('UpdateClusterLayout',{roles:[{id:node.id,zone:'local',capacity:1073741824,tags:[]}]});
    await request('ApplyClusterLayout',{version:layout.version+1});
  }
  const keys=await request('ListKeys');
  if(!keys.some(key=>key.id===process.env.CLOUD_STORAGE_ACCESS_KEY_ID))await request('ImportKey',{name:'life-hud-local',accessKeyId:process.env.CLOUD_STORAGE_ACCESS_KEY_ID,secretAccessKey:process.env.CLOUD_STORAGE_SECRET_ACCESS_KEY});
  const buckets=await request('ListBuckets');
  let bucket=buckets.find(item=>item.globalAliases?.includes(process.env.CLOUD_STORAGE_BUCKET));
  if(!bucket)bucket=await request('CreateBucket',{globalAlias:process.env.CLOUD_STORAGE_BUCKET});
  await request('AllowBucketKey',{bucketId:bucket.id,accessKeyId:process.env.CLOUD_STORAGE_ACCESS_KEY_ID,permissions:{read:true,write:true,owner:false}});
  console.log('Garage layout, private bucket and application key are ready.');
};
