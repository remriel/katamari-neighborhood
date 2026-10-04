$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskTemp = Join-Path $taskRoot 'outputs/asset-tmp'
New-Item -ItemType Directory -Force -Path $taskTemp | Out-Null
$taskSource = Join-Path $taskRoot 'art/toytown/toy-town-source.glb'
Copy-Item -LiteralPath (Join-Path $taskRoot 'public/models/toy-town.glb') -Destination $taskSource
function Invoke-GltfStep([string[]] $taskArguments) {
  & npx --yes @gltf-transform/cli @taskArguments
  if ($LASTEXITCODE -ne 0) { throw "Asset optimization failed: $($taskArguments[0])" }
}
Invoke-GltfStep @('dedup', $taskSource, "$taskTemp/dedup.glb")
Invoke-GltfStep @('weld', "$taskTemp/dedup.glb", "$taskTemp/weld.glb")
Invoke-GltfStep @('prune', "$taskTemp/weld.glb", "$taskTemp/clean.glb")
& node "$PSScriptRoot/prepare-far-lod.mjs" "$taskTemp/clean.glb" "$taskTemp/far-unwelded.glb"
if ($LASTEXITCODE -ne 0) { throw 'Far model preparation failed' }
Invoke-GltfStep @('weld', "$taskTemp/far-unwelded.glb", "$taskTemp/far-welded.glb")
Invoke-GltfStep @('simplify', "$taskTemp/far-welded.glb", "$taskTemp/far.glb", '--ratio', '0.45', '--error', '0.02')
Invoke-GltfStep @('quantize', "$taskTemp/clean.glb", "$taskRoot/public/models/toy-town.glb", '--quantize-position', '14', '--quantize-normal', '10', '--quantize-color', '8')
Invoke-GltfStep @('quantize', "$taskTemp/far.glb", "$taskRoot/public/models/toy-town-lod.glb", '--quantize-position', '14', '--quantize-normal', '10', '--quantize-color', '8')
$taskManifestPath = Join-Path $taskRoot 'public/models/manifest.json'
$taskManifest = Get-Content -LiteralPath $taskManifestPath -Raw | ConvertFrom-Json
$taskManifest | Add-Member -NotePropertyName lod -NotePropertyValue '/models/toy-town-lod.glb' -Force
$taskManifest | Add-Member -NotePropertyName optimization -NotePropertyValue 'dedup/weld/prune; 14-bit positions, 10-bit normals; same-pivot 45% target far LOD with 2% error bound' -Force
[System.IO.File]::WriteAllText($taskManifestPath, ($taskManifest | ConvertTo-Json -Depth 20), [System.Text.UTF8Encoding]::new($false))
& python "$PSScriptRoot/write-art-ratios.py"
if ($LASTEXITCODE -ne 0) { throw 'Attachment size metadata could not be preserved' }
