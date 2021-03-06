/* Copyright 2014 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFViewer) {
  // eslint-disable-next-line no-alert
  alert("Please build the pdfjs-dist library using\n  `gulp dist-install`");
}

// The workerSrc property shall be specified.
//
pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.js';

// Some PDFs need external cmaps.
//
var CMAP_URL = "../../node_modules/pdfjs-dist/cmaps/";
var CMAP_PACKED = true;

let params = (new URL(document.location)).searchParams;
var DEFAULT_URL = params.get('file') ?? "../TheValueOfVisualization.pdf";
var SEARCH_FOR = "Value"; // try 'Mozilla';

var container = document.getElementById("viewerContainer");

var eventBus = new pdfjsViewer.EventBus();

// (Optionally) enable hyperlinks within PDF files.
var pdfLinkService = new pdfjsViewer.PDFLinkService({
  eventBus,
});

// (Optionally) enable find controller.
var pdfFindController = new pdfjsViewer.PDFFindController({
  eventBus,
  linkService: pdfLinkService,
});

var pdfViewer = new pdfjsViewer.PDFViewer({
  container,
  eventBus,
  linkService: pdfLinkService,
  findController: pdfFindController,
});
pdfLinkService.setViewer(pdfViewer);

eventBus.on("pagesinit", function () {
  // We can use pdfViewer now, e.g. let's change default scale.
  pdfViewer.currentScaleValue = "page-width";

  // We can try searching for things.
  if (SEARCH_FOR) {
    pdfFindController.executeCommand("find", { query: SEARCH_FOR });
  }
});

// Loading document.
var loadingTask = pdfjsLib.getDocument({
  url: DEFAULT_URL,
  cMapUrl: CMAP_URL,
  cMapPacked: CMAP_PACKED,
});

loadingTask.promise.then(function (pdfDocument) {
  // Document loaded, specifying document for the viewer and
  // the (optional) linkService.
  pdfViewer.setDocument(pdfDocument);

  pdfLinkService.setDocument(pdfDocument, null);

  pdfViewer.pagesPromise.then(function(pdfDocument) {
    const views = pdfViewer._pages,
          first = views[0],
          last = views[views.length-1];

    const visible = views.map(view => {
      const element = view.div;
      const currentWidth = element.offsetLeft + element.clientLeft;
      const currentHeight = element.offsetTop + element.clientTop;

      return {
        id: view.id,
        x: currentWidth,
        y: currentHeight,
        view,
        percent: 100
      }
    });

    pdfViewer._getVisiblePages = function() {
      return {
        first: visible[0],
        last: visible[visible.length-1],
        views: visible
      }
    };

    eventBus.on('pagerender', (evt) => {
      // If we've rendered the last page, load NB
      if (evt.pageNumber === views.length) {
        let s = document.createElement('script'); s.src= 'https://nb2.csail.mit.edu/client/js/bundle.js'; document.body.append(s);
      }
    });

    pdfViewer.update();
  })
});
