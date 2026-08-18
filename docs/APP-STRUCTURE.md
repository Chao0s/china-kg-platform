# APP-STRUCTURE.md — Agreed app structure (1:1 with the source flowcharts)

> This is the **structural source of truth**. The Mermaid charts below are a **1:1 mirror** of
> `Platform Flow.txt` (kept verbatim for consultation and rendered on the docs site). The machine-readable
> contract derived from them is [`harness/structure/app-structure.json`](../harness/structure/app-structure.json),
> which the **structure judge** (`harness/judges/structure_judge.py`) enforces: when application code drifts
> from this structure, the commit is blocked with a reminder to correct.
>
> 本文件是结构的唯一真相。下方 Mermaid 图为 `Platform Flow.txt` 的 1:1 镜像（逐字保留，供查阅并在文档站渲染）。由其派生的机器可读契约为 `harness/structure/app-structure.json`，由结构评审强制校验：代码与结构不符时阻断提交并提示纠正。
>
> When the agreed structure changes, edit **both** this file and `app-structure.json` in the same commit.

## Surfaces and role access / 端与角色权限

| Surface / 端 | admin 管理端 | teacher 教师端 | parent 家长端 |
|---|---|---|---|
| Mini Program — staff modules (党建/综合协调/教研培训/资源库/案例库) | Yes | Yes | **No** |
| Mini Program — 家园社共育 + 首页/通知 | Yes | Yes | Yes (own child only) |
| **PC backend / CMS (PC后台)** | **Yes** | **No** | **No** |

There are **exactly two Mini Programs** this cycle — 教师端 and 家长端. There is **no admin Mini Program**:
the admin role acts through the teacher client for content management and uses the PC后台 for cross-class
work. The rows above describe module access by role, not a separate admin app.

Key rule confirmed: the **PC backend / CMS is admin-only**. Teachers and parents have **no CMS access** in the
current scope. The parent client surfaces only home-school-community co-education content plus its own notices
and tasks; it never renders staff modules. See [ADR-0002](adr/0002-co-education-naming.md) for the canonical
module name (家园社共育, including 社 / community; the flowchart title `家园共育` is the legacy name).

## Module map / 模块地图

1. 首页 Home — flowchart 01
2. 党建管理 Party-building management — flowchart 02
3. 综合协调 Administrative coordination — flowchart 03
4. 教研培训 Teaching-research and training — flowchart 04
5. 资源库 + 案例库 Resource library + Case library — flowchart 05
6. 家园社共育 Home-school-community co-education — flowchart 06
7. 家长端 Parent client — flowchart 07
8. PC后台 PC backend — flowchart 08

---

## 01 · 首页 Home

```mermaid
flowchart LR
    Home["首页"]

    Home --> Todo["待办事项"]
    Home --> Notice["资源中心通知"]
    Home --> Quick["常用入口"]
    Home --> Recommend["推荐课程案例"]

    %% — 待办事项：按端口显示不同内容 —
    Todo --> M_Todo["管理端待办"]
    M_Todo --> M_Audit["资源审核"]
    M_Audit --> AuditList["审核列表页"]
    AuditList --> AuditDetail["审核详情页"]
    AuditDetail --> Pass["通过"]
    AuditDetail --> Reject["驳回并填写原因"]
    Pass --> PublishLib["进入资源库 / 案例库展示"]
    Reject --> BackTeacher["退回教师修改"]

    M_Todo --> M_Task["共建任务"]
    M_Task --> TaskCreate["发布共建任务"]
    TaskCreate --> TaskSelect["选择参与教师\n填写截止时间 / 任务说明"]
    TaskSelect --> TaskBoard["任务进度看板"]

    Todo --> T_Todo["教师端待办"]
    T_Todo --> UploadEntry["上传资源 / 上传案例"]
    UploadEntry --> UploadForm["填写表单\n上传图文 / 附件"]
    UploadForm --> SubmitAudit["提交审核"]
    SubmitAudit --> AuditList

    T_Todo --> TeacherTask["待完成任务"]
    TeacherTask --> TaskDetail["任务详情页"]
    TaskDetail --> SubmitMaterial["提交材料 / 反馈"]
    SubmitMaterial --> TaskBoard

    Todo --> ParentTodo["家长端待办"]
    ParentTodo --> ParentNotice["通知"]
    ParentNotice --> NoticeDetail["通知详情页"]
    ParentTodo --> ParentTask["亲子任务"]
    ParentTask --> ParentTaskDetail["任务详情页"]
    ParentTaskDetail --> ParentUpload["上传图片 / 文字 / 视频反馈"]

    %% — 首页其他入口 —
    Notice --> NoticeList["通知列表页"]
    NoticeList --> NoticeDetail

    Quick --> Q1["教研培训"]
    Q1 --> TrainList["教研培训列表 / 会议链接"]
    Quick --> Q2["在园时光"]
    Q2 --> GardenPublish["在园时光发布页"]
    Quick --> Q3["月度评价"]
    Q3 --> MonthEval["月度评价填写页"]
    Quick --> Q4["课程资源"]
    Q4 --> CourseResourceHome["课程库 + 资源库首页"]

    Recommend --> CaseCard["优秀课程案例卡片"]
    CaseCard --> CaseDetail["案例详情页"]
```

## 02 · 党建管理 Party-building management

```mermaid
flowchart LR
    Party["党建管理"]

    Party --> Learn["党建学习"]
    Learn --> LearnList["学习资料列表"]
    LearnList --> LearnDetail["资料详情页"]
    LearnDetail --> LearnView["查看政策文件\n共享课堂视频链接"]

    Party --> Activity["党建活动"]
    Activity --> ActivityList["活动列表页"]
    ActivityList --> ActivityDetail["活动详情页"]
    ActivityDetail --> ActivityFile["图文 / 照片 / 附件查看"]

    Party --> Brand["品牌建设"]
    Brand --> BrandList["品牌建设资料列表"]
    BrandList --> BrandDetail["品牌建设详情页"]
    BrandDetail --> BrandFile["文件 / 照片查看"]

    PC_Upload["管理端 / PC后台上传"] --> LearnList
    PC_Upload --> ActivityList
    PC_Upload --> BrandList

    Note["说明：党建管理主要为资料呈现，\n教师端以查看为主，上传建议放在PC后台。"]
```

## 03 · 综合协调 Administrative coordination

```mermaid
flowchart LR
    Admin["综合协调"]

    Admin --> XZ["行政统筹"]
    XZ --> XZList["行政资料列表"]
    XZList --> XZDetail["行政资料详情"]
    XZDetail --> XZFiles["政策法规 / 通知文件 / 组织架构"]

    Admin --> HQ["后勤保障"]
    HQ --> HQList["后勤资料列表"]
    HQList --> HQDetail["后勤资料详情"]
    HQDetail --> HQFiles["安全管理文件 / 卫生保健文件"]

    Admin --> HR["人事管理"]
    HR --> HRList["人事资料列表"]
    HRList --> HRDetail["人事资料详情"]
    HRDetail --> HRFiles["师德师风图文 / 跟岗交流图文"]

    PC_Upload["PC后台上传资料\n建议优先使用PC端"] --> XZList
    PC_Upload --> HQList
    PC_Upload --> HRList

    MobileView["教师手机端"] --> XZList
    MobileView --> HQList
    MobileView --> HRList

    Note["说明：综合协调以文件查看为主，\n手机端负责查看，PC端负责上传。"]
```

## 04 · 教研培训 Teaching-research and training

```mermaid
flowchart LR
    Teach["教研培训"]

    Teach --> CourseBuild["课程建设"]
    CourseBuild --> CourseIntro["课程体系图文介绍"]
    CourseIntro --> CourseIntroDetail["办园理念 / 课程体系详情页"]
    CourseBuild --> FiveChart["评价五维图"]
    FiveChart --> TermEval["学期末综合评价"]
    TermEval --> Scale["填写五大领域量表"]
    Scale --> Radar["生成五维雷达图"]
    CourseBuild --> ObserveNote["观察记录"]
    ObserveNote --> WeCom["不加入小程序\n由园方通过企业微信单独收集"]

    Teach --> CR["课程库 + 资源库"]
    CR --> ResourceLib["资源库"]
    CR --> CaseLib["课程库 / 案例库"]

    Teach --> Train["教研培训"]
    Train --> TrainList["研修列表页"]
    TrainList --> TrainDetail["研修详情页"]
    TrainDetail --> TrainNotice["研修通知"]
    TrainDetail --> TrainMaterial["研修材料\nPPT / PDF / 视频链接"]
    TrainDetail --> TrainFeedback["研修反馈 / 评论"]
    TrainFeedback --> FeedbackExport["后台提取评论内容\n用于后续汇总"]

    Note["1.0重点：课程资源、教研资料、评价五维图。\n复杂评论分析可放后续版本迭代。"]
```

## 05 · 资源库 + 案例库 Resource library + Case library

```mermaid
flowchart LR
    CRHome["课程库 + 资源库首页"]

    CRHome --> ResourceLib["资源库"]
    ResourceLib --> ResourceCategory["资源分类\n衣 / 食 / 住 / 行 / 艺"]
    ResourceCategory --> ResourceList["资源列表页"]
    ResourceList --> ResourceCard["资源卡片"]
    ResourceCard --> ResourceDetail["资源详情页"]

    ResourceDetail --> R1["资源简介"]
    ResourceDetail --> R2["资源解读"]
    ResourceDetail --> R3["资源获取"]
    ResourceDetail --> R4["资源转化建议"]
    ResourceDetail --> R5["关联课程案例"]
    R5 --> CaseDetail["跳转至案例详情页"]

    CRHome --> CaseLib["课程库 / 案例库"]
    CaseLib --> CaseFilter["案例筛选\n年级 / 五大领域 / 活动形式 / 资源标签"]
    CaseFilter --> CaseList["案例列表页"]
    CaseList --> CaseCard["案例卡片"]
    CaseCard --> CaseDetail

    CaseDetail --> C1["案例简介"]
    CaseDetail --> C2["详案查看 / 下载"]
    CaseDetail --> C3["教师自评"]
    CaseDetail --> C4["他评"]
    CaseDetail --> C5["活动反思"]
    CaseDetail --> C6["关联资源"]
    C6 --> ResourceDetail

    C2 --> DownloadRecord["后台记录下载账号 / 时间"]

    TeacherUpload["教师上传资源或案例"] --> Draft["草稿"]
    Draft --> Submit["提交审核"]
    Submit --> Audit["管理端审核"]
    Audit --> Approved["通过：进入资源库 / 案例库"]
    Audit --> Rejected["驳回：退回修改"]
    Approved --> ResourceList
    Approved --> CaseList
    Rejected --> TeacherUpload
```

## 06 · 家园社共育 Home-school-community co-education

> Source title in `Platform Flow.txt` reads `家园共育总交互逻辑` (legacy); the canonical module name is
> 家园社共育 — see [ADR-0002](adr/0002-co-education-naming.md).

```mermaid
flowchart LR
    Family["家园社共育"]

    Family --> Garden["在园时光"]
    Family --> ParentTask["亲子任务\n含社区教育类型"]
    Family --> GrowthFile["成长档案"]
    Family --> GrowthBook["成长册"]

    %% — 在园时光 —
    Garden --> GardenPublish["教师发布"]
    GardenPublish --> SelectChild["选择班级 / 幼儿\n可单选或多选"]
    SelectChild --> UploadMoment["上传照片 / 视频 / 文字"]
    UploadMoment --> PublishMoment["发布"]
    PublishMoment --> ParentViewMoment["对应家长查看"]
    Garden --> GardenProgress["发布进度汇总\n一周两次频率参考"]

    %% — 亲子任务 + 社区教育 —
    ParentTask --> TaskPublish["教师发布任务"]
    TaskPublish --> TaskType["选择任务类型\n普通亲子任务 / 社区教育任务"]
    TaskType --> TaskRequire["填写任务要求 / 截止时间 / 上传要求"]
    TaskRequire --> PublishTask["发布给家长"]
    PublishTask --> ParentUpload["家长上传反馈\n图片 / 文字 / 视频"]
    ParentUpload --> TaskProgress["教师查看完成进度"]

    %% — 成长档案 —
    GrowthFile --> MonthEval["月度评价"]
    MonthEval --> SelectMonthChild["选择月份 / 幼儿"]
    SelectMonthChild --> FillMonth["填写月度评价"]
    FillMonth --> PublishMonth["发布给家长"]

    GrowthFile --> TermEval["学期评价"]
    TermEval --> Scale["填写五大领域量表"]
    Scale --> Radar["生成五维雷达图"]
    Radar --> TermReport["生成综合评估报告"]
    TermReport --> ExportReport["发布给家长（导出与否见 G36，未决）"]

    %% — 成长册 —
    GrowthBook --> BookCreate["生成成长册"]
    BookCreate --> ChooseTemplate["选择模板"]
    ChooseTemplate --> CheckContent["勾选纳入内容"]
    CheckContent --> FromMoment["在园时光"]
    CheckContent --> FromTask["亲子任务 / 社区教育"]
    CheckContent --> FromEval["月度评价 / 学期评价"]
    CheckContent --> FromIntro["园所介绍 / 班级介绍 / 教师寄语"]
    FromMoment --> BookPreview["成长册预览"]
    FromTask --> BookPreview
    FromEval --> BookPreview
    FromIntro --> BookPreview
    BookPreview --> BookExport["确认定稿并开放（仅应用内）"]
    BookExport --> ParentBookView["家长端查看"]
```

> **成长册自 F17 起仅在应用内。** 不出 PDF、不出图片册、不可下载、不可分享、不做服务端渲染；上图的
> "确认定稿并开放" 指状态由 `b1` 迁移到 `b2`，而非产出文件。评估报告的导出（`ExportReport`）是另一回事，
> 目前记为未决缺口 G36，本文不予判定。

## 07 · 家长端 Parent client

```mermaid
flowchart LR
    ParentHome["家长端首页\n尽量保持简单"]

    ParentHome --> PNotice["通知"]
    PNotice --> PNoticeList["通知列表"]
    PNoticeList --> PNoticeDetail["通知详情"]

    ParentHome --> PTask["亲子任务"]
    PTask --> PTaskList["任务列表"]
    PTaskList --> PTaskDetail["任务详情"]
    PTaskDetail --> PSubmit["提交反馈\n图片 / 文字 / 视频"]
    PSubmit --> TeacherReview["教师端查看完成情况"]

    ParentHome --> PMoment["在园时光"]
    PMoment --> PMomentList["孩子相关动态列表"]
    PMomentList --> PMomentDetail["动态详情"]

    ParentHome --> PGrowthFile["成长档案"]
    PGrowthFile --> PMonth["月度评价查看"]
    PGrowthFile --> PTerm["学期评价 / 五维图查看"]

    ParentHome --> PGrowthBook["成长册"]
    PGrowthBook --> PBookPreview["成长册预览"]
    PBookPreview --> PBookDownload["下载 / 保存，视功能范围确定"]

    Note["家长端原则：只保留家园社共育相关内容，\n不展示党建、综合协调、教研培训等教师端模块。"]
```

## 08 · PC后台 / 管理端 PC backend

```mermaid
flowchart LR
    PC["PC后台 / 管理端"]

    PC --> User["用户管理"]
    User --> Import["名单导入"]
    User --> Manual["手动录入"]
    User --> Search["搜索\n幼儿园 / 教师 / 班级 / 家长"]
    User --> Role["权限分配\n管理端 / 教师端 / 家长端"]

    PC --> Content["内容管理"]
    Content --> NoticeManage["资源中心通知管理"]
    Content --> PartyManage["党建资料管理"]
    Content --> AdminManage["综合协调资料管理"]
    Content --> TrainManage["教研培训资料管理"]
    Content --> RecommendManage["首页推荐课程案例管理"]

    PC --> Audit["审核管理"]
    Audit --> ResourceAudit["资源审核"]
    Audit --> CaseAudit["案例审核"]
    Audit --> AuditAction["通过 / 驳回 / 填写原因"]

    PC --> Task["共建任务管理"]
    Task --> PublishTask["发布任务"]
    PublishTask --> SelectPeople["选择参与人员"]
    SelectPeople --> TaskProgress["查看完成进度"]

    PC --> Data["数据记录"]
    Data --> DownloadLog["下载记录"]
    Data --> BrowseLog["浏览记录，可选"]
    Data --> FeedbackExport["研修反馈 / 评论提取"]

    Note["建议：文件类资料优先PC端上传；\n手机端用于高频轻量操作，如拍照、提交反馈、查看任务。"]
```

---

## Structural invariants (enforced) / 结构不变量（强制）

These are mirrored in `harness/structure/app-structure.json` and checked by the structure judge:

1. Every UGC-write screen routes writes through the content-moderation gate before content is visible (ADR-0005).
2. The parent client cannot reach party-building, administrative coordination, teaching-research, or the libraries.
3. The PC backend / CMS is reachable only by admin; teacher and parent have no route into it.
4. Observation records (观察记录) are out of scope and must not appear as a screen (collected via WeCom).
5. 家园社共育 is canonical; the legacy name must not appear as a module or screen name.

## How conformance is checked / 如何校验

- Contract: [`harness/structure/app-structure.json`](../harness/structure/app-structure.json) (screen ids mirror the node ids above).
- Route map: `harness/structure/route-map.json` maps each screen id to a real page path once the app exists.
- Judge: `harness/judges/structure_judge.py` runs inside `npm run gate`. With no app code it passes with a note; once `pages.json`/`app.json` exists it blocks on missing required pages, role-access violations, and UGC paths lacking moderation.
- Truth refresh: run `/understand-anything:understand` to rebuild `.understand-anything/knowledge-graph.json`; the judge and reviewers use it to compare the live codebase map against this structure.
