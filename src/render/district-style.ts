/** Material palettes belong to places; tower and enemy counter colours stay stable. */
export const DISTRICT_STYLE=[
  {name:'Millpond',day:['#cbd1a2','#91ad86','#688f83'],night:['#274c53','#193c49','#122c3d'],bank:['#dbd2ad','#aaa98d'],water:['#285e6d','#508e8d','#bcddd0'],walls:['#90aaa2','#e7debb','#526e73'],accent:'#e7bc7a'},
  {name:'Harbour',day:['#e1c8a0','#b7b18d','#7c9991'],night:['#394755','#283b49','#172f40'],bank:['#dcc7aa','#b6a28b'],water:['#345f77','#688f9d','#c7dad7'],walls:['#c29678','#ead5ad','#806768'],accent:'#e9bb8d'},
  {name:'Glass gardens',day:['#cbd7b0','#9ebc98','#6a9b8f'],night:['#304f52','#22434a','#17333e'],bank:['#e0d7b6','#b0b39a'],water:['#306b75','#6baba1','#d1e4d4'],walls:['#9eb59a','#e5e5bf','#56796f'],accent:'#ecce91'},
  {name:'Tide basin',day:['#ced6c9','#a4b9b1','#7b9d9f'],night:['#3a4562','#293d53','#192e46'],bank:['#dbd8c8','#a7b4ac'],water:['#456883','#799eac','#d3e1dc'],walls:['#98a5b5','#dfdcc9','#647383'],accent:'#deb5a4'},
] as const
export const districtStyle=(variant=0)=>DISTRICT_STYLE[variant]??DISTRICT_STYLE[0]
