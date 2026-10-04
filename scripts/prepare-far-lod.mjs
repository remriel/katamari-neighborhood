import {readFileSync,writeFileSync} from 'node:fs';
const [input,output]=process.argv.slice(2),data=readFileSync(input);
const length=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+length).toString('utf8'));
// Flat shading derives face normals in the shader. Removing split normal
// accessors lets the far mesh weld and simplify across same-color facets.
for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.attributes.NORMAL;
const encoded=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,0x20);encoded.copy(padded);
const tail=data.subarray(20+length),result=Buffer.alloc(20+padded.length+tail.length);
data.copy(result,0,0,12);result.writeUInt32LE(result.length,8);result.writeUInt32LE(padded.length,12);result.writeUInt32LE(0x4e4f534a,16);
padded.copy(result,20);tail.copy(result,20+padded.length);writeFileSync(output,result);
