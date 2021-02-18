import { Component, OnInit, ElementRef, ViewChild } from "@angular/core";
import { MatPaginator } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";

import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl
} from "@angular/forms";
import * as XLSX from "xlsx";

// AOA : array of array
type AOA = any[][];

@Component({
  selector: "app-generator",
  templateUrl: "./generator.component.html",
  styleUrls: ["./generator.component.scss"]
})
export class GeneratorComponent implements OnInit {
  constructor(private el: ElementRef, private _formBuilder: FormBuilder) {}
  isMaxSelect = false;
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  currentPage = 0;
  isEmptyDrop = true;
  isExcelDrop = true;
  isRadioChecked = false;

  /**
   * sheet.js
   */
  origExcelData: AOA = [
    ["Data: 2018/10/26"],
    ["Data: 2018/10/26"],
    ["Data: 2018/10/26"]
  ];
  refExcelData: Array<any>;
  excelFirstRow = [];
  excelDataEncodeToJson: any = new MatTableDataSource();
  excelTransformNum = [];
  sheetJsExcelName = "null.xlsx";

  /* excel sheet.js */
  sheetCellRange;
  sheetMaxRow;
  localwSheet;
  localWorkBook;
  localPDF;
  sheetNameForTab: Array<string> = ["excel tab 1", "excel tab 2"];
  totalPage = this.sheetNameForTab.length;
  selectDefault;
  sheetBufferRender;

  pdfFile;
  pdfSrc;
  pdfBufferRender;

  inputExcelOnClick(evt) {
    const target: HTMLInputElement = evt.target;
    if (target.files.length === 0) {
      throw new Error("未上傳");
    }
    if (target.files.length > 1) {
      throw new Error("Cannot use multiple files");
    }
    this.sheetJsExcelName = evt.target.files.item(0).name;
    const reader: FileReader = new FileReader();
    this.readerExcel(reader);
    reader.readAsArrayBuffer(target.files[0]);
    this.sheetBufferRender = target.files[0];
    this.isEmptyDrop = false;
    this.isExcelDrop = true;
  }

  /** Analyze excel, from DragDropDirective, TODO: Use <ng-template> to determine t/f
   * @example DragDropDirective handles drop event and file name filtering.
   * @returns return excel structure {readAsArrayBuffer}
   */
  dropExcelOnChance(targetInput: Array<File>) {
    this.sheetJsExcelName = targetInput[0].name;
    if (targetInput.length !== 1) {
      throw new Error("Cannot use multiple files HAHAHAHAHA");
    }
    const reader: FileReader = new FileReader();
    this.readerExcel(reader);
    reader.readAsArrayBuffer(targetInput[0]);
    this.sheetBufferRender = targetInput[0];
    this.isEmptyDrop = false;
    this.isExcelDrop = true;
  }

  dropExcelBlock(fileList: Array<File>) {
    if (fileList.length === 0) {
      return;
    } else {
      this.isExcelDrop = false;
      throw new Error("ERROR");
      /* TODO: trigger pop-up window */
    }
  }

  /**
   * @example parses excel, from button event, click tab to switch pagination
   * @returns return excel structure {readAsArrayBuffer}
   */
  loadSheetOnTabClick(index: number) {
    this.currentPage = index;
    /* Filter exception */
    if (this.localWorkBook === undefined) {
      throw new Error("ERROR");
      return;
    }
    /* onload from this.localWorkBook, reReader from this.sheetBufferRender*/
    const reader: FileReader = new FileReader();
    this.readerExcel(reader, index);
    reader.readAsArrayBuffer(this.sheetBufferRender);
  }

  ngOnInit() {
    this.firstFormGroup = this._formBuilder.group({
      firstCtrl: ["", Validators.required]
    });
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ["", Validators.required]
    });
  }

  onClickRadioExcel() {
    if (this.localWorkBook === undefined) {
      throw new Error("ERROR");
      return;
    }
    this.isExcelDrop = true;
    this.isEmptyDrop = false;
  }

  consoleHeight(evt) {
    if (evt.panel.nativeElement.clientHeight >= 255) {
      this.isMaxSelect = true;
    } else {
      this.isMaxSelect = false;
    }
  }

  readerExcel(reader, index = 0) {
    /* reset array */
    this.origExcelData = [];
    reader.onload = (e: any) => {
      const data: string = e.target.result;
      const wBook: XLSX.WorkBook = XLSX.read(data, { type: "array" });
      this.localWorkBook = wBook;
      const wsname: string = wBook.SheetNames[index];
      this.sheetNameForTab = wBook.SheetNames;
      this.totalPage = this.sheetNameForTab.length;
      this.selectDefault = this.sheetNameForTab[index];
      const wSheet: XLSX.WorkSheet = wBook.Sheets[wsname];
      this.localwSheet = wSheet;
      this.sheetCellRange = XLSX.utils.decode_range(wSheet["!ref"]);
      this.sheetMaxRow = this.sheetCellRange.e.r;
      this.origExcelData = <AOA>XLSX.utils.sheet_to_json(wSheet, {
        header: 1,
        range: wSheet["!ref"],
        raw: true
      });
      this.refExcelData = this.origExcelData
        .slice(1)
        .map(value => Object.assign([], value));
      /* Grab range & clear account A->Z */
      this.excelTransformNum = [];
      for (let idx = 0; idx <= this.sheetCellRange.e.c; idx++) {
        //this.excelTransformNum[idx] = this.transform(idx);
        this.excelTransformNum[idx] = this.origExcelData[0][idx];
      }
      /* Add place to order (#) */
      this.refExcelData.map(x => x.unshift("#"));
      this.excelTransformNum.unshift("order");
      console.log(this.sheetCellRange);
      console.log(this.sheetMaxRow);
      /* merge into JSON */
      this.excelDataEncodeToJson = this.refExcelData.slice(0).map(item =>
        item.reduce((obj, val, i) => {
          obj[this.excelTransformNum[i]] = val;
          return obj;
        }, {})
      );
      this.excelDataEncodeToJson = this.excelDataEncodeToJson.filter(
        (item, index) => {
          return index >= 0;
        }
      );
      this.filterData();
      this.validateData();
    };
  }

  limit: number = 5;
  index: number = 0;
  dataSource;

  changePage(event) {
    //console.log(event);
    this.limit = event.pageSize;
    this.index = event.pageIndex;
    this.filterData();
  }

  filterData() {
    this.dataSource = this.excelDataEncodeToJson.filter((item, index) => {
      return (
        index >= this.index * this.limit &&
        index <= (this.index + 1) * this.limit - 1
      );
    });
  }

  isNumber(stringInput: String): boolean {
    let result: number;
    try {
      result = +stringInput;
    } catch (e) {
      console.log("Error!" + result);
      return false;
    }
    return true;
  }

  validateData() {
    for (let row = 1; row <= this.sheetMaxRow; row++) {
      if (this.isNumber(this.excelDataEncodeToJson[row][0]) == false) {
        console.log("Error!");
      }
    }
  }
}
