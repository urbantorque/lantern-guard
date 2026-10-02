/** Material palettes belong to places; tower and enemy counter colours stay stable. */
export const DISTRICT_STYLE=[
  {name:'Millpond',day:['#d2e3a4','#73b69b','#398f97'],night:['#254c72','#173e59','#102d48'],bank:['#eee2bc','#b6ccb7'],water:['#176e8d','#2abbbd','#91ece0'],walls:['#729bad','#dce5cb','#3c697d'],accent:'#eec27c'},
  {name:'Harbour',day:['#eed5ad','#9cbaa7','#598e9e'],night:['#3f486a','#293951','#172d43'],bank:['#dcc7b0','#a99992'],water:['#295784','#588eb8','#b5d2e7'],walls:['#b77460','#ddbd9a','#714d55'],accent:'#efb386'},
  {name:'Glass gardens',day:['#d6edbd','#7abfaf','#3a9694'],night:['#3d536d','#234b55','#163541'],bank:['#e8dcb5','#adcab6'],water:['#236f81','#42b7ae','#c2f2d6'],walls:['#80bca6','#dbedcf','#447c79'],accent:'#f5d892'},
  {name:'Tide basin',day:['#c7d9e4','#83aeb5','#5b839f'],night:['#464777','#273d60','#1b294a'],bank:['#d9d7df','#a6b5c9'],water:['#3b578f','#758dcb','#c2d3f7'],walls:['#858cb9','#cbd0e6','#4f5d89'],accent:'#eea8ba'},
] as const
export const districtStyle=(variant=0)=>DISTRICT_STYLE[variant]??DISTRICT_STYLE[0]
