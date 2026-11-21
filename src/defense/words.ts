export const DEFENSE_SHORT =
  'arc,ash,bay,bolt,bow,cart,clay,coal,crow,dawn,dew,dust,elm,fang,fern,flag,flint,fog,fox,gate,gem,glow,gust,hawk,helm,hill,horn,ink,iron,ivy,jade,jest,keel,kite,lamp,lark,leaf,lens,loom,lynx,mast,mint,moat,moth,nail,nest,oak,oar,orb,owl,path,pike,pine,quay,quill,raft,reed,rook,rope,rune,sage,salt,seed,shoe,silk,slab,soot,spur,star,tide,tin,toll,tusk,urn,vale,vane,vine,wax,well,wick,wing,wolf,yarn,yew,yoke,zinc,zeal'.split(',');

export const DEFENSE_MID =
  'anchor,archer,armour,beacon,bridge,bucket,canyon,castle,cinder,cipher,cobble,copper,cursor,dagger,drifts,dragon,embers,falcon,fathom,ferric,forger,gallop,garden,gravel,goblet,hammer,harbor,hearth,helmet,hollow,island,jasper,jigsaw,kettle,kindle,ladder,lantern,legion,marble,meadow,mortar,needle,nimbus,oracle,orchid,parcel,pebble,pillar,plinth,quiver,quarry,rampart,ribbon,rudder,saddle,sentry,signal,timber,turret,tunnel,umbral,vessel,voyage,walker,willow,window,yonder,zenith,zephyr'.split(',');

export const DEFENSE_LONG =
  'barricade,battlement,blacksmith,blueprint,catapult,chronicle,drawbridge,earthwork,embrasure,fortitude,garrison,gatehouse,guardian,hairline,horseshoe,isometric,keystroke,labyrinth,lighthouse,longbowman,machinery,mountaineer,nightwatch,outrider,palisade,parchment,pathfinder,portcullis,quartermaster,rainmaker,scaffolding,silhouette,stronghold,trebuchet,undercroft,vanguard,watchtower,wheelwright,yeomanry'.split(',');

export const DEFENSE_LINES = [
  'hold the line',
  'raise the gate',
  'light the beacon',
  'the wall holds',
  'ink and iron',
  'type to defend',
  'the keep stands',
  'bring the rope',
  'watch the gate',
  'the tide turns',
  'sound the horn',
  'arrows at dawn',
  'stone on stone',
  'a quick red fox',
  'keep the fire',
  'shields up now',
];

export const pickDefense = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export const randDefense = (a: number, b: number): number => a + Math.random() * (b - a);
