/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClinicPhoto {
  id: string;
  title: string;
  category: 'room' | 'lounge' | 'corridor' | 'courtyard' | 'sandplay';
  categoryLabel: string;
  imageUrl: string;
  description: string;
  acousticFeature: string;
  specDetails: string[];
}

export interface ClinicLocation {
  id: 'jingan' | 'xuhui';
  name: string;
  badge: string;
  tagline: string;
  address: string;
  buildingName: string;
  floor: string;
  metroGuide: string[];
  driveGuide: string;
  parkingTip: string;
  privacySetting: string[];
  contactPhone: string;
  openHours: string;
  latitude: number;
  longitude: number;
  photos: ClinicPhoto[];
  panoramas: {
    title: string;
    description: string;
    defaultAngle: number;
    hotspots: Array<{ x: number; y: number; title: string; desc: string }>;
  }[];
}

export const CLINIC_LOCATIONS: Record<'jingan' | 'xuhui', ClinicLocation> = {
  jingan: {
    id: 'jingan',
    name: '知心谷 · 上海静安独立私密个案中心',
    badge: '静安核心 · 旗舰中心',
    tagline: '独栋高区声学隔音花园中心 · 双层密闭降噪',
    address: '上海市静安区南京西路1788号1788广场高区',
    buildingName: '1788广场 (国际甲级涉外写字楼)',
    floor: '28层 专属私密心理空间 (配备独立门禁)',
    metroGuide: [
      '地铁 2号线 / 7号线 / 14号线【静安寺站】8号口直通大厦地下连通道',
      '从8号口出站步行仅约 280 米，全程无风雨遮挡',
      '沿南京西路步行至1788广场主迎宾大堂，乘坐高区专属客梯'
    ],
    driveGuide: '导航目的地设定为【1788广场地下停车场】，入口位于南京西路辅道',
    parkingTip: '大厦B2/B3设有专属访客车位，到诊凭微信客服预约凭证向前台领取【2小时免费停车券】',
    privacySetting: [
      '独立单向来访动线设计，避免来访者之间面碰或擦肩而过',
      '全室德国标杆双层阻尼声学隔音板，实测隔音量高达 55dB',
      '专业定制医用级白噪音掩蔽发生器，杜绝门缝微声泄露',
      '医疗级负离子新风系统，每小时全室换气 4 次'
    ],
    contactPhone: '021-6288-5188 / 138-1234-5601',
    openHours: '周一至周日 09:00 - 21:30 (实行严格分时段预约制)',
    latitude: 31.2227,
    longitude: 121.4485,
    photos: [
      {
        id: 'ja-1',
        title: '独立声学个案咨询室 · 浅草暖阳',
        category: 'room',
        categoryLabel: '个案咨询室',
        imageUrl: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80',
        description: '专为一对一深度谈话设计，配备符合人体工程学的减压扶手沙发、可调色温防眩暖光与自然落地窗。',
        acousticFeature: '双层声学阻尼隔音墙 (STC 55dB) + 门底气密升降条',
        specDetails: ['室内净面积 22㎡', '瑞士Airgle专业除菌新风机', '静音白噪音掩蔽系统']
      },
      {
        id: 'ja-2',
        title: '绿植候诊与安神茶歇区 · 幽篁静室',
        category: 'lounge',
        categoryLabel: '候诊茶歇',
        imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
        description: '独立私密等候隔断，提供依云矿泉水、有机洋甘菊及薰衣草舒缓草本茶饮，伴随白噪音流水音韵。',
        acousticFeature: '吸音吸震软木地板与吸音棉软包吊顶',
        specDetails: ['独立私密包厢隔断', '有机无咖啡因草本茶饮', '放松神经递质精油扩香']
      },
      {
        id: 'ja-3',
        title: '表达性艺术与儿童沙盘室 · 灵动心境',
        category: 'sandplay',
        categoryLabel: '沙盘艺术',
        imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        description: '国际标准尺寸干/湿沙盘，陈列 2,000+ 具世界各国民俗、动植物、建筑与神话沙具，用于潜意识投射与情绪整合。',
        acousticFeature: '四周全软包吸音皮革，消除回音杂音',
        specDetails: ['国际ISST标准实木沙箱', '天然海蚀细白沙', '全系列多维意象沙具']
      },
      {
        id: 'ja-4',
        title: '单向私密离开通道 · 独立动线',
        category: 'corridor',
        categoryLabel: '私密动线',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        description: '采用日本临床心理机构单向出入动线，咨询结束由来访专属通道直接连接电梯厅，确保100%不与候诊访客碰面。',
        acousticFeature: '长廊无声静音地毯',
        specDetails: ['单向电子磁吸感应门', '隐形无标识设计', '直达高区客梯厅']
      }
    ],
    panoramas: [
      {
        title: '360° 沉浸式声学咨询室全景空间',
        description: '拖拽视角观察德国声学阻尼隔音墙、私密舒适沙发距离与暖调环境光源',
        defaultAngle: 0,
        hotspots: [
          { x: 30, y: 45, title: '德国声学隔音门', desc: '采用双气密声学升降条，关门瞬间阻断室外全部杂音' },
          { x: 55, y: 50, title: '人体工学减压沙发', desc: '咨访双方呈 90°-120° 黄金非对峙视角，带来安全倾诉感' },
          { x: 80, y: 40, title: '环境调光与温湿度', desc: '色温固定在 3000K 柔暖无直射光，温度恒定在 24℃' }
        ]
      }
    ]
  },
  xuhui: {
    id: 'xuhui',
    name: '知心谷 · 上海徐汇衡复风貌花园中心',
    badge: '衡复风貌 · 人文洋房',
    tagline: '百年法式洋房私家绿植庭院 · 沉静自然疗愈',
    address: '上海市徐汇区衡山路890弄衡复历史文化风貌区',
    buildingName: '衡复独立法式建筑花园洋房',
    floor: '整栋 1-3层 (配有独立法式私家花园)',
    metroGuide: [
      '地铁 1号线 / 9号线 / 11号线【徐家汇站】3号口出站步行约 350 米',
      '沿天钥桥路北行至衡山路梧桐林荫道，进入独立洋房私密庭院',
      '庭院入口设有隐藏式静音对讲，前台专人无感接待'
    ],
    driveGuide: '导航至【衡山路890弄】或【徐家汇公园地下停车场】',
    parkingTip: '洋房门前设有 3 个预约专属地面车位，或停放于徐家汇公园地库（提供2小时停车费报销）',
    privacySetting: [
      '独立独栋洋房设置，无其他商业机构交叉，私密性极高',
      '厚重历史红砖墙体天然隔音，搭配现代中空隔音玻璃窗',
      '法式绿植庭院提供自然白噪音（梧桐落叶、鸟鸣流水）',
      '严格一案一号知情保密，专属个案室全封闭隔离'
    ],
    contactPhone: '021-6433-8822 / 138-1234-5602',
    openHours: '周二至周日 10:00 - 21:00 (提前24小时预约锁定)',
    latitude: 31.1982,
    longitude: 121.4390,
    photos: [
      {
        id: 'xh-1',
        title: '精神动力学沉静个案室 · 梧桐树影',
        category: 'room',
        categoryLabel: '动力学咨询室',
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
        description: '胡桃木沉静色调与复古壁炉设计，配有经典精神分析躺椅与扶手椅，适于长程自我探索与依恋重塑。',
        acousticFeature: '实木多层吸音壁板 + 德国中空Low-E隔音窗',
        specDetails: ['室内净面积 26㎡', '配备经典分析躺椅', '面朝百年梧桐私密庭院']
      },
      {
        id: 'xh-2',
        title: '衡复洋房绿植庭院 · 身心着陆区',
        category: 'courtyard',
        categoryLabel: '洋房花园',
        imageUrl: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=1200&q=80',
        description: '咨询前后可在此小坐，绿意盎然的庭院让人迅速褪去都会浮躁，在大自然气息中实现身心接地。',
        acousticFeature: '自然植物声景隔音屏障',
        specDetails: ['百年梧桐与常春藤覆盖', '露天防腐木静心甲板', '提供温热毛巾与定制花草茶']
      },
      {
        id: 'xh-3',
        title: '家庭与青少年互动咨询室 · 温暖港湾',
        category: 'room',
        categoryLabel: '家庭亲子室',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        description: '空间开阔温和，专为伴侣咨询、亲子会谈及未成年人知情访谈配置多组舒适座椅与互动白板。',
        acousticFeature: '全频段吸音蜂窝结构墙',
        specDetails: ['可容纳 2-5 人家庭咨询', '互动绘画与投射卡片箱', '独立空气净化与净水系统']
      }
    ],
    panoramas: [
      {
        title: '360° 衡复洋房动力学咨询室',
        description: '沉浸感受胡桃木书房静谧氛围、自然梧桐光影与独立私密设置',
        defaultAngle: 0,
        hotspots: [
          { x: 35, y: 50, title: '精神分析分析椅与躺椅', desc: '经典动力学设置，助来访者进入自由联想与潜意识探索' },
          { x: 65, y: 45, title: '中空中德隔音窗', desc: '有效过滤外界马路杂声，保留庭院鸟语自然声景' }
        ]
      }
    ]
  }
};
