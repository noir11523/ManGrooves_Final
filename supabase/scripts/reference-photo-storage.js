export async function allowReferenceJpegs(client) {
  const name='mangrooves-reference';
  const {data:bucket,error}=await client.storage.getBucket(name);
  if(error)throw error;
  // null already means unrestricted. Preserve all existing limits and visibility.
  if(bucket.allowed_mime_types && !bucket.allowed_mime_types.includes('image/jpeg')){
    const {error:updated}=await client.storage.updateBucket(name,{
      public:bucket.public,
      fileSizeLimit:bucket.file_size_limit,
      allowedMimeTypes:[...bucket.allowed_mime_types,'image/jpeg'],
    });
    if(updated)throw updated;
  }
}
