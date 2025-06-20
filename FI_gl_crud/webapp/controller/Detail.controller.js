sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/UIComponent",
        "sap/ui/model/json/JSONModel",
        "sap/m/ColumnListItem",
        "sap/m/Text",
        "sap/m/Input",
        "sap/m/Button",
        "sap/m/MessageBox",
    ],
    function (
        Controller,
        UIComponent,
        JSONModel,
        ColumnListItem,
        Text,
        Input,
        Button,
        MessageBox
    ) {
        "use strict";

        return Controller.extend("sync.ca.fi.gl_crud.controller.Detail", {
            onInit: function () {
                // 상태관리용 ViewModel 선언
                var oViewModel = new JSONModel({
                    editMode: false, // 기본은 조회모드
                    newTexts: [], // 임시로 추가될 계정 텍스트 목록
                    deletedTexts: [], // 삭제 예정 목록
                });
                this.getView().setModel(oViewModel, "view");

                var aTypeList = [
                    { key: "K", text: "K(매입채무)" },
                    { key: "D", text: "D(매출채권)" },
                    { key: "S", text: "S(일반계정)" },
                    { key: "M", text: "M(자재)" },
                ];
                var oTypeModel = new sap.ui.model.json.JSONModel(aTypeList);
                this.getView().setModel(oTypeModel, "typeList");

                // 언어코드 모델 수동 read (ODataModel에서 수동으로)
                var oLangModel =
                    this.getOwnerComponent().getModel("ZCA_CDS_V_007_CDS");
                oLangModel.read("/ZCA_CDS_V_007", {
                    success: function (oData) {
                        var oJsonModel = new sap.ui.model.json.JSONModel(
                            oData.results
                        );
                        this.getView().setModel(oJsonModel, "LangList");
                    }.bind(this),
                    error: function () {
                        sap.m.MessageToast.show(
                            "언어 목록을 불러오지 못했습니다."
                        );
                    },
                });

                // Router 객체 가져와서 pattern matched 이벤트 연결
                var oRouter = UIComponent.getRouterFor(this);
                oRouter
                    .getRoute("RouteDetail")
                    .attachPatternMatched(this._onPatternMatched, this);
            },

            _onPatternMatched: function (oEvent) {
                // 라우트 파라미터(키)로 바인딩
                var oArgs = oEvent.getParameter("arguments");
                this.sBukrs = oArgs.Bukrs;
                this.sSaknr = oArgs.Saknr;

                // OData 엔터티 키 바인딩 - 실제 EntitySet명/Key 맞게 수정!
                var sPath = `/ZCA_C_004(Bukrs='${oArgs.Bukrs}',Saknr='${oArgs.Saknr}')`;
                debugger;
                this.getView().bindElement({
                    path: sPath,
                    parameters: {
                        expand: "to_Texts", // 네비게이션 자동 expand
                    },
                });
                // 배치 그룹 설정
                var oModel = this.getView().getModel();
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["textBatch"]);

                // 상세 들어올 때는 항상 editMode=false
                this.getView().getModel("view").setProperty("/editMode", false);
                // 조회용 바인딩 세팅
                this._bindTableView();
            },

            // 조회용 테이블
            _bindTableView: function () {
                var oView = this.getView();
                var oTable = oView.byId("idTextsTable");

                oTable.unbindItems();
                oTable.setModel(oView.getModel(), undefined); // ODataModel 사용

                oTable.bindItems({
                    path: "to_Texts",
                    sorter: [new sap.ui.model.Sorter("Spras", true)],
                    template: new ColumnListItem({
                        cells: [
                            new Text({ text: "{Spras}" }),
                            new Text({ text: "{Txt20}" }),
                        ],
                    }),
                });
            },

            // 수정용 테이블
            _bindTableEdit: function () {
                var oView = this.getView();
                var oTable = oView.byId("idTextsTable");

                oTable.unbindItems();
                oTable.setModel(oView.getModel("edit"), "edit"); // JSON 편집 모델 지정

                oTable.bindItems({
                    path: "edit>/to_Texts",
                    sorter: [new sap.ui.model.Sorter("Spras", true)],
                    template: new ColumnListItem({
                        cells: [
                            new Text({ text: "{edit>Spras}" }),
                            new Input({ value: "{edit>Txt20}" }),
                            new Button({
                                icon: "sap-icon://delete",
                                press: [this.onRemoveRow, this],
                                type: "Transparent",
                            }),
                        ],
                    }),
                });
            },

            // 닫기 버튼: 메인으로 이동
            onClose: function () {
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteMain");
            },

            // 전체화면 전환 버튼
            onDetailFullScreen: function () {
                var oModelApp = this.getOwnerComponent().getModel("app");
                var sNextLayout = oModelApp.getProperty(
                    "/actionButtonsInfo/midColumn/fullScreen"
                );
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteDetail", {
                    layout: sNextLayout,
                    Bukrs: this.sBukrs,
                    Saknr: this.sSaknr,
                });
            },

            // 전체화면 나가기 버튼
            onDetailExitFullScreen: function () {
                var oModelApp = this.getOwnerComponent().getModel("app");
                var sNextLayout = oModelApp.getProperty(
                    "/actionButtonsInfo/midColumn/exitFullScreen"
                );
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteDetail", {
                    layout: sNextLayout,
                    Bukrs: this.sBukrs,
                    Saknr: this.sSaknr,
                });
            },

            onEdit: function () {
                var oView = this.getView();
                var oCtx = oView.getBindingContext();
                var oData = oCtx.getObject({ expand: "to_Texts" }); // expand 포함
                var oEditData = JSON.parse(JSON.stringify(oData));

                // to_Texts 도 추가하도록 함
                if (oData.to_Texts && typeof oData.to_Texts === "object") {
                    var oTexts = [];
                    for (var i in oData.to_Texts) {
                        if (
                            oData.to_Texts.hasOwnProperty(i) &&
                            !i.startsWith("__")
                        ) {
                            oTexts.push(oData.to_Texts[i]);
                        }
                    }
                    oEditData.to_Texts = oTexts;
                }

                oView.setModel(new JSONModel(oEditData), "edit");
                oView.getModel("view").setProperty("/editMode", true);
                this._bindTableEdit(); // 편집용 바인딩
            },

            // 취소
            onCancelEdit: function () {
                var oModel = this.getView().getModel();
                var aNewTexts =
                    this.getView().getModel("view").getProperty("/newTexts") ||
                    [];

                aNewTexts.forEach(function (oText) {
                    var sPath = oModel.createKey("/ZCA_C_005", {
                        Bukrs: oText.Bukrs,
                        Saknr: oText.Saknr,
                        Spras: oText.Spras,
                    });
                    oModel.remove(sPath);
                });

                // 편집모드 종료 및 데이터 재조회
                this.getView().getModel("view").setProperty("/editMode", false);
                this.getView().getModel("view").setProperty("/newTexts", []);
                this._bindTableView(); // 조회용 바인딩 복원
            },

            onSave: function () {
                var oView = this.getView();
                var oModel = oView.getModel(); // ODataModel
                var oEditData = oView.getModel("edit").getData(); // 편집용 JSON 모델의 데이터
                var oCtx = oView.getBindingContext();
                var sPath = oCtx.getPath();

                var aNewTexts =
                    oView.getModel("view").getProperty("/newTexts") || [];
                var aDeletedTexts =
                    oView.getModel("view").getProperty("/deletedTexts") || [];

                // 1. 계정 마스터 정보 update
                var oUpdateData = {
                    Saknr: oEditData.Saknr,
                    Bukrs: oEditData.Bukrs,
                    Xbilk: oEditData.Xbilk,
                    ReconYn: oEditData.ReconYn,
                };

                oModel.update(sPath, oUpdateData, {
                    groupId: "textBatch",
                });

                // 2. to_Texts 중 수정된 항목만 선별
                var aOriginalTexts =
                    oCtx.getObject({ expand: "to_Texts" }).to_Texts || [];
                var aCurrentTexts = oEditData.to_Texts || [];

                // debugger;
                aCurrentTexts.forEach(function (oNew) {
                    var oOld = aOriginalTexts.find(
                        (o) => o.Spras === oNew.Spras
                    );
                    if (oOld && oOld.Txt20 !== oNew.Txt20) {
                        var sKeyPath = oModel.createKey("/ZCA_C_005", {
                            Bukrs: oNew.Bukrs,
                            Saknr: oNew.Saknr,
                            Spras: oNew.Spras,
                        });
                        console.log("update경로: ", sKeyPath);
                        console.log("update되는거: ", oNew);
                        oModel.update(
                            sKeyPath,
                            { Txt20: oNew.Txt20 },
                            {
                                groupId: "textBatch",
                            }
                        );
                    }
                });

                // 3. 삭제 요청 처리
                aDeletedTexts.forEach(function (oText) {
                    var sKeyPath = oModel.createKey("/ZCA_C_005", {
                        Bukrs: oText.Bukrs,
                        Saknr: oText.Saknr,
                        Spras: oText.Spras,
                    });
                    console.log("delete경로: ", sKeyPath);
                    console.log("delete하는거: ", oText);
                    oModel.remove(sKeyPath, {
                        groupId: "textBatch",
                    });
                });

                // 4. 새 항목 추가 처리
                aNewTexts.forEach(function (oText) {
                    console.log("추가:", oText);
                    oModel.create("/ZCA_C_005", oText, {
                        groupId: "textBatch",
                    });
                });

                // 5. 일괄 저장 요청
                oModel.submitChanges({
                    groupId: "textBatch",
                    success: function () {
                        sap.m.MessageToast.show("저장 완료!");
                        oModel.refresh(true);
                        oView.getModel("view").setProperty("/editMode", false);
                        oView.getModel("view").setProperty("/newTexts", []);
                        oView.getModel("view").setProperty("/deletedTexts", []);
                        this._bindTableView();
                    }.bind(this),
                    error: function () {
                        sap.m.MessageToast.show("저장 실패");
                    },
                });
            },

            onOpenAddTextDialog: function () {
                // 임시 모델 초기화 (언어코드는 사용가능한 첫 값으로 기본 셋팅)
                var aAllLangs =
                    this.getView().getModel("LangList").getData() || [];

                var oEditModel = this.getView().getModel("edit");
                var aExistingTexts = oEditModel.getProperty("/to_Texts") || [];
                var aExistSpras = aExistingTexts.map((o) => o.Spras);

                // 선택 가능한 언어만 필터링
                var aAvailableLangs = aAllLangs.filter(function (lang) {
                    return !aExistSpras.includes(lang.Spras);
                });

                // 선택 가능한 언어가 없다면 return
                if (aAvailableLangs.length === 0) {
                    sap.m.MessageToast.show("추가할 수 있는 언어가 없습니다.");
                    return;
                }

                var sDefaultSpras = aAvailableLangs[0].Spras;

                // 임시 모델 생성
                var oAddLangModel = new JSONModel({
                    Spras: sDefaultSpras,
                    Txt20: "",
                    availableLangs: aAvailableLangs,
                });
                this.getView().setModel(oAddLangModel, "addLangModel");
                this.openDialog();
            },

            async openDialog() {
                this.oDialog ??= await this.loadFragment({
                    name: "sync.ca.fi.gl_crud.view.AccountTextAdd",
                });
                this.oDialog.open();
            },

            onAddTextConfirm: function () {
                var oView = this.getView();
                var oAddLangModel = oView.getModel("addLangModel");
                var oEditModel = oView.getModel("edit");
                var oViewModel = oView.getModel("view");

                var aRows = oEditModel.getProperty("/to_Texts") || [];

                var sSpras = oAddLangModel.getProperty("/Spras");
                var sTxt20 = oAddLangModel.getProperty("/Txt20");

                if (!sSpras || !sTxt20) {
                    sap.m.MessageToast.show("언어와 계정명을 입력하세요.");
                    return;
                }

                if (aRows.some((r) => r.Spras === sSpras)) {
                    sap.m.MessageToast.show("이미 추가된 언어입니다.");
                    return;
                }

                var oNewEntry = {
                    Spras: sSpras,
                    Txt20: sTxt20,
                    Bukrs: oEditModel.getProperty("/Bukrs"),
                    Saknr: oEditModel.getProperty("/Saknr"),
                };

                // 1. edit 모델에만 추가 (즉시 화면 반영)
                aRows.push(oNewEntry);
                oEditModel.setProperty("/to_Texts", aRows);

                // 2. view 모델에도 저장 → 나중에 onSave에서만 create
                var aNewTexts = oViewModel.getProperty("/newTexts") || [];
                aNewTexts.push(oNewEntry);
                oViewModel.setProperty("/newTexts", aNewTexts);

                this.byId("idAddTextDialog").close();
            },
            onAddTextCancel: function () {
                this.byId("idAddTextDialog").close();
            },

            onRemoveRow: function (oEvent) {
                var oView = this.getView();
                var oEditModel = oView.getModel("edit");
                var oViewModel = oView.getModel("view");

                // debugger;
                // 1. 현재 눌린 Row의 BindingContext 가져오기
                var oContext = oEvent.getSource().getBindingContext("edit");
                if (!oContext) return;

                // 2. 현재 Row의 실제 데이터
                var oRow = oContext.getObject();

                // 3. 기존 to_Texts에서 해당 row 제거
                var aRows = oEditModel.getProperty("/to_Texts") || [];
                var aFiltered = aRows.filter(function (row) {
                    return !(
                        row.Spras === oRow.Spras &&
                        row.Bukrs === oRow.Bukrs &&
                        row.Saknr === oRow.Saknr
                    );
                });

                oEditModel.setProperty("/to_Texts", aFiltered);

                // 4. 삭제한 항목은 deletedTexts에 저장
                var aDeleted = oViewModel.getProperty("/deletedTexts") || [];
                aDeleted.push(oRow);
                oViewModel.setProperty("/deletedTexts", aDeleted);

                // 5. 디버깅 및 리프레시
                console.log("삭제:", oRow);
                oEditModel.refresh(true); // 강제 화면 갱신
            },

            onDelete: function (oEvent) {
                var oButton = oEvent.getSource();
                var oContext = oButton.getBindingContext();
                var sPath = oContext.getPath();
                var sGl = oContext.getProperty("GlAccountName");
                var oModel = this.getView().getModel();
                var that = this;

                // 삭제 전 확인 팝업
                MessageBox.confirm(
                    `정말로 계정 '${sGl}'을(를) 삭제하시겠습니까?`,
                    {
                        title: "계정 삭제 확인",
                        icon: MessageBox.Icon.WARNING,
                        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                        emphasizedAction: MessageBox.Action.YES,
                        onClose: function (sAction) {
                            if (sAction === MessageBox.Action.YES) {
                                oModel.remove(sPath, {
                                    success: function () {
                                        MessageBox.success(
                                            `계정 ${sGl}가 삭제되었습니다.`
                                        );
                                        var oRouter =
                                            UIComponent.getRouterFor(that);
                                        oRouter.navTo("RouteMain");
                                        sap.ui
                                            .getCore()
                                            .getEventBus()
                                            .publish("GLAccount", "Deleted");
                                    },
                                    error: function (oError) {
                                        MessageBox.error(
                                            `계정 ${sGl} 삭제를 실패했습니다.`
                                        );
                                    },
                                });
                            }
                        },
                    }
                );
            },
        });
    }
);
