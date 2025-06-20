sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sync/ca/fi/gl_crud/model/formatter",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/Fragment",
    ],
    (
        Controller,
        JSONModel,
        MessageBox,
        formatter,
        Filter,
        FilterOperator,
        Fragment
    ) => {
        "use strict";

        return Controller.extend("sync.ca.fi.gl_crud.controller.Main", {
            formatter: formatter,
            onInit: function () {
                this._initializeDummyList();
                this.onUpdateFinished();
                this._initializeViewModels();
                this._bindAccountList();
                this._updateTabCountsFromFilterBarOnly();

                const oView = this.getView();
                const oMessageManager = sap.ui.getCore().getMessageManager();

                // 메시지 모델 연결
                oView.setModel(oMessageManager.getMessageModel(), "message");
                oMessageManager.registerObject(oView, true); // View 전체 바인딩 대상 등록
            },

            _initializeViewModels: function () {
                this.getView().setModel(
                    new JSONModel({
                        detailCategoryList: [],
                        detailCategoryEditable: true,
                    }),
                    "view"
                );

                this.getView().setModel(
                    new JSONModel({
                        ALL: 0,
                        ASSET: 0,
                        ASSET1: 0,
                        ASSET2: 0,
                        LIABILITY: 0,
                        LIABILITY1: 0,
                        CAPITAL: 0,
                        REVENUE: 0,
                        EXPENSE: 0,
                        ETC: 0,
                    }),
                    "tabCounts"
                );

                const aCategoryList = [
                    { key: "자산", text: "자산" },
                    { key: "부채", text: "부채" },
                    { key: "자본", text: "자본" },
                    { key: "수익", text: "수익" },
                    { key: "비용", text: "비용" },
                    { key: "기타", text: "기타" },
                ];
                this.getView().setModel(
                    new JSONModel(aCategoryList),
                    "categoryList"
                );

                this._oDetailCategoryMap = {
                    자산: [
                        { key: "당좌자산", text: "당좌자산" },
                        { key: "재고자산", text: "재고자산" },
                    ],
                    부채: [{ key: "유동부채", text: "유동부채" }],
                };

                const aTypeList = [
                    { key: "K", text: "K(매입채무)" },
                    { key: "D", text: "D(매출채권)" },
                    { key: "S", text: "S(일반계정)" },
                    { key: "M", text: "M(자재)" },
                ];
                this.getView().setModel(new JSONModel(aTypeList), "typeList");

                const oLangModel =
                    this.getOwnerComponent().getModel("ZCA_CDS_V_007_CDS");
                oLangModel.read("/ZCA_CDS_V_007", {
                    success: (oData) => {
                        this.getView().setModel(
                            new JSONModel(oData.results),
                            "LangList"
                        );
                    },
                    error: () =>
                        sap.m.MessageToast.show(
                            "언어 목록을 불러오지 못했습니다."
                        ),
                });
                sap.ui
                    .getCore()
                    .getEventBus()
                    .subscribe(
                        "GLAccount",
                        "Deleted",
                        this._onAccountDeleted,
                        this
                    );
            },

            _onAccountDeleted: function () {
                this.getView().getModel().refresh(true); // ODataModel refresh
                this._updateTabCountsFromFilterBarOnly(); // 필터 조건에 맞게 카운트 업데이트
            },

            _initializeDummyList: function () {
                const oDummyList = this.byId("dummyList");
                const oModel = this.getOwnerComponent().getModel();
                oDummyList.setModel(oModel);

                if (!oDummyList.getBinding("items")) {
                    oDummyList.bindItems({
                        path: "/ZCA_C_004",
                        parameters: { expand: "to_Texts" },
                        template: new sap.m.StandardListItem({
                            title: "{GlAccountName}",
                        }),
                    });
                }
            },

            _bindAccountList: function () {
                const oList = this.byId("accountList");

                oList.bindItems({
                    path: "/ZCA_C_004",
                    parameters: {
                        expand: "to_Texts",
                    },
                    sorter: [
                        new sap.ui.model.Sorter("CategoryMajor", true, true),
                        new sap.ui.model.Sorter("Lvorm", false, true),
                    ],
                    groupHeaderFactory: this.createGroupHeader,
                    template: new sap.m.StandardListItem({
                        title: "{GlAccountName}",
                        description: "{Saknr}",
                        type: "Navigation",
                        press: this.onPress.bind(this),
                        info: {
                            parts: [
                                { path: "Lvorm" },
                                { path: "CategoryMajor" },
                                { path: "CategoryDetail" },
                            ],
                            formatter: this.formatter.infoText,
                        },
                        infoState: {
                            path: "Lvorm",
                            formatter: function (v) {
                                return v === true ? "Error" : "None";
                            },
                        },
                        highlight: {
                            path: "Lvorm",
                            formatter: function (v) {
                                return v === true ? "Error" : "None";
                            },
                        },
                    }),
                });
            },

            _updateTabCountsFromFilterBarOnly: function () {
                const aFilters = this._collectFiltersFromFilterBar();
                const oDummyList = this.byId("dummyList");
                const oBinding = oDummyList.getBinding("items");

                oBinding.filter(aFilters);
                oDummyList.attachEventOnce("updateFinished", () => {
                    const aItems = oBinding
                        .getContexts(0, Infinity)
                        .map((ctx) => ctx.getObject());
                    const oCounts = this._calculateTabCounts(aItems);
                    this.getView().getModel("tabCounts").setData(oCounts);
                });
            },

            onPress(oEvent) {
                var oContext = oEvent.getSource().getBindingContext();
                var sGl = oContext.getProperty(); // gl
                var sGlText = oContext.getProperty("to_Texts"); // gl texts

                sap.m.MessageToast.show(
                    `Gl 계정: ${sGl.GlAccountName}(${sGl.Saknr})`
                );

                var oUIState = this.getOwnerComponent()
                    .getFlexibleLayoutInfo()
                    .getNextUIState(1);
                // "TwoColumnsMidExpanded"

                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteDetail", {
                    Bukrs: sGl.Bukrs,
                    Saknr: sGl.Saknr,
                    layout: oUIState.layout,
                });
            },

            onFilterClear: function () {
                const oFilterBar = this.byId("filterBar");

                oFilterBar.getAllFilterItems().forEach(function (oItem) {
                    const oControl = oItem.getControl();

                    if (oControl.setValue) {
                        oControl.setValue(""); // Input 초기화
                    }
                    if (oControl.setSelectedKeys) {
                        oControl.setSelectedKeys([]); // MultiComboBox 초기화
                    }
                    if (oControl.setState) {
                        oControl.setState(true); // Switch 초기화
                    }
                });

                // 세부분류 관련 상태도 초기화
                const oViewModel = this.getView().getModel("view");
                oViewModel.setProperty("/detailCategoryList", []);
                oViewModel.setProperty("/detailCategoryEditable", false);

                // 리스트도 필터 제거
                this.byId("accountList").getBinding("items").filter([]);
                this._updateTabCountsFromFilterBarOnly();
            },

            createGroupHeader: function (oGroup) {
                const sKey = oGroup.key;

                const colorMap = {
                    자산: "group-header-asset",
                    부채: "group-header-liability",
                    자본: "group-header-capital",
                    수익: "group-header-revenue",
                    비용: "group-header-expense",
                    기타: "group-header-etc",
                };

                const sStyleClass = colorMap[sKey] || "group-header-default";

                return new sap.m.GroupHeaderListItem({
                    title: sKey,
                    upperCase: false,
                    type: "Inactive",
                }).addStyleClass(sStyleClass);
            },

            onSearch: function () {
                const oFB = this.byId("filterBar");
                const aAndFilters = [];

                // 계정명: 단일 조건 (Contains)
                const sName = oFB
                    .determineControlByName("GlAccountName")
                    .getValue();
                if (sName) {
                    aAndFilters.push(
                        new Filter(
                            "GlAccountName",
                            FilterOperator.Contains,
                            sName
                        )
                    );
                }

                // 대분류: 다중 OR
                const aMajor = oFB
                    .determineControlByName("CategoryMajor")
                    .getSelectedKeys();
                if (aMajor && aMajor.length > 0) {
                    const aOrMajor = aMajor.map(
                        (sKey) =>
                            new Filter("CategoryMajor", FilterOperator.EQ, sKey)
                    );
                    aAndFilters.push(
                        new Filter({ filters: aOrMajor, and: false })
                    );
                }

                // 세부분류: 다중 OR
                const aDetail = oFB
                    .determineControlByName("CategoryDetail")
                    .getSelectedKeys();
                if (aDetail && aDetail.length > 0) {
                    const aOrDetail = aDetail.map(
                        (sKey) =>
                            new Filter(
                                "CategoryDetail",
                                FilterOperator.EQ,
                                sKey
                            )
                    );
                    aAndFilters.push(
                        new Filter({ filters: aOrDetail, and: false })
                    );
                }

                // 계정유형: 다중 OR
                const aXbilk = oFB
                    .determineControlByName("Xbilk")
                    .getSelectedKeys();
                if (aXbilk && aXbilk.length > 0) {
                    const aOrXbilk = aXbilk.map(
                        (sKey) => new Filter("Xbilk", FilterOperator.EQ, sKey)
                    );
                    aAndFilters.push(
                        new Filter({ filters: aOrXbilk, and: false })
                    );
                }

                // 삭제여부: 단일 조건 (NE true → 삭제 제외)
                const bIncludeDeleted =
                    this.byId("idIncludeDeleted").getState();
                if (!bIncludeDeleted) {
                    aAndFilters.push(
                        new Filter("Lvorm", FilterOperator.NE, true)
                    );
                }

                // 리스트 필터링 적용
                const oList = this.byId("accountList");
                const oBinding = oList.getBinding("items");
                if (oBinding) {
                    oBinding.filter(aAndFilters); // 전체는 AND
                }
                debugger;

                // 탭 '전체' 선택
                this.byId("categoryTabBar").setSelectedKey("All");

                // 카운트 업데이트
                this._updateTabCountsFromFilterBarOnly();
            },

            _calculateTabCounts: function (aData) {
                const oCounts = {
                    ALL: aData.length,
                    ASSET: 0,
                    ASSET1: 0,
                    ASSET2: 0,
                    LIABILITY: 0,
                    LIABILITY1: 0,
                    CAPITAL: 0,
                    REVENUE: 0,
                    EXPENSE: 0,
                    ETC: 0,
                };

                aData.forEach((o) => {
                    switch (o.CategoryMajor) {
                        case "자산":
                            oCounts.ASSET++;
                            break;
                        case "부채":
                            oCounts.LIABILITY++;
                            break;
                        case "자본":
                            oCounts.CAPITAL++;
                            break;
                        case "수익":
                            oCounts.REVENUE++;
                            break;
                        case "비용":
                            oCounts.EXPENSE++;
                            break;
                        case "기타":
                            oCounts.ETC++;
                            break;
                    }
                    switch (o.CategoryDetail) {
                        case "당좌자산":
                            oCounts.ASSET1++;
                            break;
                        case "재고자산":
                            oCounts.ASSET2++;
                            break;
                        case "유동부채":
                            oCounts.LIABILITY1++;
                            break;
                    }
                });

                return oCounts;
            },
            onUpdateFinished: function () {
                const oModel = this.getOwnerComponent().getModel();
                oModel.read("/ZCA_C_004", {
                    success: (oData) => {
                        const aData = Array.isArray(oData.results)
                            ? oData.results
                            : [];
                        const oCounts = this._calculateTabCounts(aData); // 별도 함수 분리
                        this.getView().getModel("tabCounts").setData(oCounts);
                    },
                });
            },

            // 필터링 함수
            onTabSelect: function (oEvent) {
                var sKey = oEvent.getParameter("key");
                var oList = this.byId("accountList");
                var oBinding = oList.getBinding("items");
                var aFilters = this._collectFiltersFromFilterBar();
                // var aFilters = [];

                // 아이콘 탭 key에 따라 필터 결정
                switch (sKey) {
                    case "ALL":
                        // 전체는 필터 없음
                        break;
                    case "ASSET":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryMajor",
                                sap.ui.model.FilterOperator.EQ,
                                "자산"
                            )
                        );
                        break;
                    case "LIABILITY":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryMajor",
                                sap.ui.model.FilterOperator.EQ,
                                "부채"
                            )
                        );
                        break;
                    case "CAPITAL":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryMajor",
                                sap.ui.model.FilterOperator.EQ,
                                "자본"
                            )
                        );
                        break;
                    case "REVENUE":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryMajor",
                                sap.ui.model.FilterOperator.EQ,
                                "수익"
                            )
                        );
                        break;
                    case "EXPENSE":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryMajor",
                                sap.ui.model.FilterOperator.EQ,
                                "비용"
                            )
                        );
                        break;
                    case "ETC":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryMajor",
                                sap.ui.model.FilterOperator.EQ,
                                "기타"
                            )
                        );
                        break;
                    case "ASSET1":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryDetail",
                                sap.ui.model.FilterOperator.EQ,
                                "당좌자산"
                            )
                        );
                        break;
                    case "ASSET2":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryDetail",
                                sap.ui.model.FilterOperator.EQ,
                                "재고자산"
                            )
                        );
                        break;
                    case "LIABILITY1":
                        aFilters.push(
                            new sap.ui.model.Filter(
                                "CategoryDetail",
                                sap.ui.model.FilterOperator.EQ,
                                "유동부채"
                            )
                        );
                        break;
                }
                oBinding.filter(aFilters);
                this._updateTabCountsFromFilterBarOnly();
            },

            _collectFiltersFromFilterBar: function () {
                const oFB = this.byId("filterBar");
                const aAndFilters = [];

                // 안전하게 컨트롤을 가져오는 함수
                const getControl = (name) => oFB.determineControlByName(name);

                // GlAccountName (Input - Contains)
                const oNameCtrl = getControl("GlAccountName");
                if (oNameCtrl && oNameCtrl.getValue && oNameCtrl.getValue()) {
                    aAndFilters.push(
                        new Filter(
                            "GlAccountName",
                            FilterOperator.Contains,
                            oNameCtrl.getValue()
                        )
                    );
                }

                // CategoryMajor (MultiComboBox - OR 조건)
                const oMajorCtrl = getControl("CategoryMajor");
                if (oMajorCtrl && oMajorCtrl.getSelectedKeys().length > 0) {
                    const aMajorFilters = oMajorCtrl
                        .getSelectedKeys()
                        .map(
                            (sKey) =>
                                new Filter(
                                    "CategoryMajor",
                                    FilterOperator.EQ,
                                    sKey
                                )
                        );
                    aAndFilters.push(
                        new Filter({ filters: aMajorFilters, and: false })
                    );
                }

                // CategoryDetail (MultiComboBox - OR 조건)
                const oDetailCtrl = getControl("CategoryDetail");
                if (oDetailCtrl && oDetailCtrl.getSelectedKeys().length > 0) {
                    const aDetailFilters = oDetailCtrl
                        .getSelectedKeys()
                        .map(
                            (sKey) =>
                                new Filter(
                                    "CategoryDetail",
                                    FilterOperator.EQ,
                                    sKey
                                )
                        );
                    aAndFilters.push(
                        new Filter({ filters: aDetailFilters, and: false })
                    );
                }

                // Xbilk (MultiComboBox - OR 조건)
                const oXbilkCtrl = getControl("Xbilk");
                if (oXbilkCtrl && oXbilkCtrl.getSelectedKeys().length > 0) {
                    const aXbilkFilters = oXbilkCtrl
                        .getSelectedKeys()
                        .map(
                            (sKey) =>
                                new Filter("Xbilk", FilterOperator.EQ, sKey)
                        );
                    aAndFilters.push(
                        new Filter({ filters: aXbilkFilters, and: false })
                    );
                }

                // 삭제 제외 스위치
                const oSwitch = this.byId("idIncludeDeleted");
                const bIncludeDeleted = oSwitch ? oSwitch.getState() : true;
                if (!bIncludeDeleted) {
                    aAndFilters.push(
                        new Filter("Lvorm", FilterOperator.NE, true)
                    );
                }

                return aAndFilters;
            },

            onOpenCreateDialog: async function () {
                if (!this._oCreateDialog) {
                    this._oCreateDialog = await this.loadFragment({
                        name: "sync.ca.fi.gl_crud.view.AccountCreate",
                    });
                    this.getView().addDependent(this._oCreateDialog);
                }

                // 기본 대분류 / 세부분류
                var sDefaultMajor = "자산";
                var aDetailList = this._oDetailCategoryMap[sDefaultMajor] || [];
                var sDefaultDetail =
                    aDetailList.length > 0 ? aDetailList[0].key : "";
                // 전체 언어 목록 가져오기
                const aAllLangs =
                    this.getView().getModel("LangList").getData() || [];

                // 계정 생성용 모델 생성
                const oModel = new JSONModel({
                    Bukrs: "1001", // 회사코드
                    GlAccountName: "", // 계정명
                    CategoryMajor: sDefaultMajor, // 기본: 자산
                    CategoryDetail: sDefaultDetail, // 기본: 당좌자산
                    Xbilk: "S", // 기본: 일반계정
                    ReconYn: false,
                    // 한글 기본 텍스트 포함
                    Texts: [
                        {
                            Spras: "KO",
                            Txt20: "",
                            availableLangs: aAllLangs, // KO 줄에도 넣기!
                        },
                    ],
                });
                this.getView().setModel(oModel, "createModel");

                // ViewModel에 세부분류 리스트 & editable 상태 세팅
                this.getView()
                    .getModel("view")
                    .setProperty("/detailCategoryList", aDetailList);
                this.getView()
                    .getModel("view")
                    .setProperty("/detailCategoryEditable", true);

                this._oCreateDialog.open();
            },

            // 대분류 변경 시 세부분류 Select 갱신
            onMajorCategoryChange: function (oEvent) {
                var sMajor = oEvent.getSource().getSelectedKey();
                var aDetailList = this._oDetailCategoryMap[sMajor] || [];
                this.getView()
                    .getModel("view")
                    .setProperty("/detailCategoryList", aDetailList);

                // 메인 모델인 createModel에서 CategoryDetail 업데이트
                const oCreateModel = this.getView().getModel("createModel");
                const sNewDetail =
                    aDetailList.length > 0 ? aDetailList[0].key : "";

                oCreateModel.setProperty("/CategoryDetail", sNewDetail);

                // editable 여부 설정
                this.getView()
                    .getModel("view")
                    .setProperty(
                        "/detailCategoryEditable",
                        aDetailList.length > 0
                    );
            },

            onFilterCategoryMajorChange: function (oEvent) {
                const aSelected = oEvent.getSource().getSelectedKeys(); // ["자산", "부채"]
                const oViewModel = this.getView().getModel("view");

                let aDetailList = [];
                let bEditable = false;

                aSelected.forEach((sKey) => {
                    if (this._oDetailCategoryMap[sKey]) {
                        aDetailList = aDetailList.concat(
                            this._oDetailCategoryMap[sKey]
                        );
                    }
                });

                // 중복 제거 (예: 유동부채가 자산과 부채에 다 있으면 한 번만 보이도록)
                const aDeduplicatedList = [];
                const oSeen = {};

                aDetailList.forEach((oItem) => {
                    if (!oSeen[oItem.key]) {
                        aDeduplicatedList.push(oItem);
                        oSeen[oItem.key] = true;
                    }
                });

                oViewModel.setProperty(
                    "/detailCategoryList",
                    aDeduplicatedList
                );
                oViewModel.setProperty(
                    "/detailCategoryEditable",
                    aDeduplicatedList.length > 0
                );
            },

            onAddCreateText: function () {
                const oView = this.getView();
                const oModel = oView.getModel("createModel");
                const aAllLangs = oView.getModel("LangList").getData() || [];
                const aTexts = oModel.getProperty("/Texts") || [];
                // 이미 존재하는 언어코드 목록 추출
                const aExistSpras = aTexts.map((t) => t.Spras);

                // 사용 가능한 언어 목록 필터링
                const aAvailableLangs = aAllLangs.filter(function (lang) {
                    return !aExistSpras.includes(lang.Spras);
                });

                if (aAvailableLangs.length === 0) {
                    sap.m.MessageToast.show("추가할 수 있는 언어가 없습니다.");
                    return;
                }

                const sNewSpras = aAvailableLangs[0].Spras;

                // 새 텍스트 항목 추가 (해당 항목만을 위한 availableLangs 포함)
                aTexts.push({
                    Spras: sNewSpras,
                    Txt20: "",
                    availableLangs: aAvailableLangs,
                });

                // 전체 모델 갱신
                oModel.setProperty("/Texts", aTexts);
            },

            onCreateConfirm: function () {
                const oMessageManager = sap.ui.getCore().getMessageManager();
                oMessageManager.removeAllMessages(); // 기존 메시지 초기화

                const sGlName = this.getView()
                    .byId("idGlAccountName")
                    .getValue();
                let bValid = true;

                if (!sGlName) {
                    bValid = false;
                    oMessageManager.addMessages(
                        new sap.ui.core.message.Message({
                            message: "계정명은 필수 항목입니다.",
                            type: sap.ui.core.MessageType.Error,
                            target: "/GlAccountName",
                            processor: this.getView().getModel("createModel"),
                        })
                    );
                }

                if (!bValid) return; // 메시지 처리 후 중단

                const oTextModel = this.getView().getModel(); // 기존 모델 (ZCA_C_004, ZCA_C_005)
                const oCreateModel =
                    this.getOwnerComponent().getModel("gl_create");
                const oCreateModel2 = this.getView().getModel("gl_create");
                const oCreate = this.getView()
                    .getModel("createModel")
                    .getData();

                // 배치 그룹 지정
                oTextModel.setUseBatch(true);
                oTextModel.setDeferredGroups(["createBatch"]);

                // 계정 생성 Payload (사전 분류 정보 → ABAP에서 처리함)
                const oPayload = {
                    Bukrs: oCreate.Bukrs,
                    Saknr: "0000000000",
                    GlAccountName: oCreate.GlAccountName,
                    CategoryMajor: oCreate.CategoryMajor,
                    CategoryDetail: oCreate.CategoryDetail,
                    Xbilk: oCreate.Xbilk,
                    ReconYn: oCreate.ReconYn,
                };

                // 마스터 계정 생성
                oCreateModel.create("/ZCA_I_004", oPayload, {
                    groupId: "createBatch",
                    success: (oMasterCreated) => {
                        console.log("생성시작", oMasterCreated);

                        const sBukrs = oMasterCreated.Bukrs;
                        const sSaknr = oMasterCreated.Saknr;
                        debugger;

                        // 텍스트 생성 요청 (Spras, Txt20)
                        const aTexts = oCreate.Texts.filter(
                            (t) => t.Spras && t.Txt20
                        );

                        aTexts.forEach((oText) => {
                            oTextModel.create(
                                "/ZCA_C_005",
                                {
                                    Bukrs: sBukrs,
                                    Saknr: sSaknr,
                                    Spras: oText.Spras,
                                    Txt20: oText.Txt20,
                                },
                                {
                                    groupId: "createBatch",
                                }
                            );
                        });

                        // 배치 저장
                        oTextModel.submitChanges({
                            groupId: "createBatch",
                            success: () => {
                                sap.m.MessageToast.show("계정 생성 완료");
                                this._oCreateDialog.close();
                                oTextModel.refresh(true);

                                // 탭을 '전체'로 이동
                                this.byId("categoryTabBar").setSelectedKey(
                                    "All"
                                );

                                // 필터 제거
                                this.byId("accountList")
                                    .getBinding("items")
                                    .filter([]);

                                // FilterBar 필드 초기화
                                const oFilterBar = this.byId("filterBar");
                                oFilterBar
                                    .getAllFilterItems()
                                    .forEach(function (oItem) {
                                        const oControl = oItem.getControl();
                                        if (oControl.setValue)
                                            oControl.setValue("");
                                        if (oControl.setSelectedKeys)
                                            oControl.setSelectedKeys([]);
                                        if (oControl.setSelected)
                                            oControl.setSelected(false);
                                    });

                                // updateFinished 후 카운트 계산
                                this._updateTabCountsFromFilterBarOnly();
                            },
                            error: () => {
                                sap.m.MessageToast.show(
                                    "계정 생성 실패 (텍스트 포함)"
                                );
                            },
                        });
                    },
                    error: () => {
                        sap.m.MessageToast.show("계정 생성 실패 (마스터)");
                    },
                });
            },

            onCreateCancel: function () {
                this._oCreateDialog.close();
            },

            onGlNameChange: function (oEvent) {
                const sNewText = oEvent.getParameter("value");
                const oModel = this.getView().getModel("createModel");
                const aTexts = oModel.getProperty("/Texts");

                const oKoEntry = aTexts.find((t) => t.Spras === "KO");
                if (oKoEntry) {
                    oKoEntry.Txt20 = sNewText;
                    oModel.setProperty("/Texts", aTexts); // 강제 리프레시
                }
            },
            onRemoveCreateText: function (oEvent) {
                const oContext = oEvent
                    .getSource()
                    .getBindingContext("createModel");
                const sPath = oContext.getPath();
                const iIndex = parseInt(sPath.split("/")[2], 10); // '/Texts/0'

                const oModel = oContext.getModel();
                const aTexts = oModel.getProperty("/Texts");

                aTexts.splice(iIndex, 1);
                oModel.setProperty("/Texts", aTexts);
            },

            onMessagePopoverPress: function (oEvent) {
                if (!this._oMessagePopover) {
                    Fragment.load({
                        name: "sync.ca.fi.gl_crud.view.MessagePopover",
                        id: this.getView().getId(),
                    }).then((oPopover) => {
                        this._oMessagePopover = oPopover;
                        this.getView().addDependent(oPopover);
                        oPopover.openBy(oEvent.getSource());
                    });
                } else {
                    this._oMessagePopover.openBy(oEvent.getSource());
                }
            },
        });
    }
);
