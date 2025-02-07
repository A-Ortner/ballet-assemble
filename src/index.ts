import {
  Dialog,
  showDialog,
  showErrorMessage,
  ToolbarButton,
  ICommandPalette
} from '@jupyterlab/apputils';

import { LabIcon } from '@jupyterlab/ui-components';

import { IDisposable, DisposableDelegate } from '@lumino/disposable';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { NotebookPanel, INotebookModel } from '@jupyterlab/notebook';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import {
  Location,
  LocationSet,
  parse,
  slice
} from '@andrewhead/python-program-analysis';

import { ConfirmWidget, FeatureSubmittedOkayWidget } from './widgets';

import {
  ISubmissionResponse,
  checkStatus,
  getEndpointUrl,
  submit,
  request,
  isAuthenticated
} from './serverextension';

const EXTENSION_NAME = 'ballet-assemble';
const PLUGIN_ID = `${EXTENSION_NAME}:plugin`;

const balletIconSvg = `<?xml version="1.0" encoding="utf-8"?><!-- Generator: Adobe Illustrator 24.3.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  --> <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 72 72" style="enable-background:new 0 0 72 72;" xml:space="preserve"> <style type="text/css"> .st0{fill:#FBDD37;} .st1{fill:#565656;} </style> <g> <g> <rect x="0" class="st0" width="72" height="72"/> </g> <g> <path class="st1" d="M23.8,16.3c0-1.2,0.6-1.8,1.8-1.8h1.7c1.2,0,1.8,0.6,1.8,1.8v11.4c0,0.4,0,0.7,0,1c0,0.3,0,0.5-0.1,0.7 c0,0.3-0.1,0.5-0.1,0.7h0.1c0.5-1,1.2-1.8,2-2.5c0.7-0.6,1.7-1.2,2.9-1.8s2.6-0.8,4.2-0.8c1.8,0,3.5,0.4,5,1.1 c1.5,0.7,2.8,1.7,3.9,3c1.1,1.3,1.9,2.8,2.5,4.6c0.6,1.8,0.9,3.8,0.9,5.9c0,2.3-0.3,4.3-0.9,6.1c-0.6,1.8-1.5,3.4-2.7,4.6 c-1.1,1.3-2.5,2.3-4,3s-3.2,1.1-5,1.1c-1.7,0-3.1-0.3-4.2-0.8c-1.1-0.6-2.1-1.2-2.8-1.8c-0.8-0.8-1.5-1.7-2-2.7h-0.1 c0,0.1,0,0.3,0.1,0.4c0.1,0.4,0.1,0.8,0.1,1.2V52c0,1.1-0.6,1.6-1.8,1.6h-1.4c-1.2,0-1.8-0.6-1.8-1.8V16.3z M29,39.6 c0,1.3,0.2,2.5,0.5,3.7c0.3,1.2,0.8,2.3,1.5,3.2c0.6,0.9,1.5,1.7,2.4,2.2c1,0.6,2.1,0.8,3.5,0.8c1.1,0,2.2-0.2,3.2-0.7 c1-0.4,1.9-1.1,2.6-1.9c0.7-0.8,1.3-1.9,1.7-3.1c0.4-1.2,0.6-2.6,0.6-4.2c0-1.5-0.2-2.9-0.6-4.1c-0.4-1.2-0.9-2.3-1.6-3.1 c-0.7-0.9-1.5-1.5-2.5-2c-1-0.5-2-0.7-3.2-0.7c-1.1,0-2.1,0.2-3,0.6c-1,0.4-1.8,1-2.6,1.8c-0.8,0.8-1.4,1.8-1.8,3.1 C29.3,36.4,29,37.9,29,39.6z"/> </g> </g> </svg>`;
const ONE_SECOND = 1000;

export class Loc implements Location {
  // tslint:disable-next-line:variable-name
  first_line: number;
  // tslint:disable-next-line:variable-name
  first_column: number;
  // tslint:disable-next-line:variable-name
  last_line: number;
  // tslint:disable-next-line:variable-name
  last_column: number;
}

/*
 * description: Returns the location (e.g. {first_line: 6, first_column: 0, last_line: 6, last_column: 10}
 * line 6 from char 0 to char 10 (include eol)) of the currently active cell
 * activeCell: currently active cell
 * content: array containing all lines of code of the notebook
 * returns: set of locations, whose first_line elem mark the lines that should be included */
export function getLocationFromCurrentCell(activeCell: any, content: String[]) {
  if (activeCell === null || activeCell.trim() === '') {
    throw new Error('Active cell is null or empty.');
  }
  if (content === null || content.length === 0) {
    throw new Error('No code found');
  }

  let firstLine = content.length;
  let lastLine = 0;

  // extract indices of first and last line
  for (let i = 0; i < content.length; i++) {
    if (activeCell.includes(content[i]) && content[i].length > 0) {
      if (i < firstLine) {
        firstLine = i;
      }
      if (i > lastLine) {
        lastLine = i;
      }
    }
  }

  let lastColumn = 0;
  if (content[firstLine].length > content[lastLine].length) {
    lastColumn = content[firstLine].length;
  } else {
    lastColumn = content[lastLine].length;
  }

  // Location starts linecount at 1, not 0. Thus +1 has to be added to linecounter
  firstLine = firstLine + 1;
  lastLine = lastLine + 1;

  let l = new Loc();
  l.first_line = firstLine;
  l.first_column = 0;
  l.last_line = lastLine;
  l.last_column = lastColumn;

  let ls = new LocationSet(l);
  return ls;
}

/* description: Takes two arrays as input and compares them by their first entry
 * a, b: arrays containing a number as their first entry
 * returns: number */
function cmp(a: (number | string)[], b: (number | string)[]) {
  if (typeof a[0] !== 'number' || typeof b[0] !== 'number') {
    throw new Error('Invalid data type.');
  }
  if (a[0] < b[0]) {
    return -1;
  } else if (b[0] < a[0]) {
    return 1;
  } else {
    return 0;
  }
}

/* description: Takes the set of locations returned by slice() and extract the given locations from the original code stored in ctsSplit.
 * Every location contains the "line" attribute, which indicates the code line that was extracted (count starts at 1).
 * Since the ctsSplit array starts at 0, an index shift needs to be performed: line = 1 of a location corresponds to
 * ctsSplit[0].
 * slicedLoc: a set of locations that indicates which entries of ctsSplit are code dependencies
 * ctsSplit: an array that contains the code of the current notebook, each entry corresponds to one line of code
 * returns: a string array of the code lines that were marked in slicedLoc */
export function getCodeFromSlice(slicedLoc: LocationSet, ctsSplit: string[]) {
  if (ctsSplit === null || ctsSplit.length === 0) {
    throw new Error('No code found.');
  }

  if (slicedLoc === null || slicedLoc.size === 0) {
    throw new Error('Slice not found.');
  }

  let codelines = [];
  for (let i = 0; i < slicedLoc.items.length; i++) {
    const line = slicedLoc.items[i].first_line;
    // [line - 1] because location type starts at 1, not 0
    let tmp = [];
    tmp.push(line);
    tmp.push(ctsSplit[line - 1]);
    codelines.push(tmp);
  }

  let arraySorted = codelines.sort((a, b) => cmp(a, b));
  let finalSlice = [];
  for (let i = 0; i < arraySorted.length; i++) {
    finalSlice.push(arraySorted[i][1]);
  }
  let result = finalSlice.join('\n');
  return result;
}

/**
 * A notebook widget extension that adds a submit button to the toolbar.
 */
export class AssembleSubmitButtonExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  settingRegistry: ISettingRegistry;

  constructor(settingRegistry: ISettingRegistry) {
    this.settingRegistry = settingRegistry;
  }

  async loadSetting(settingName: string): Promise<string> {
    return (await this.settingRegistry.get(PLUGIN_ID, settingName))
      .composite as string;
  }

  /**
   * Create a new extension object.
   */
  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    let sliceButton = this.createSliceButton(panel);
    panel.toolbar.addItem('assembleSliceButton', sliceButton);

    let button = this.createSubmitButton(panel);
    panel.toolbar.addItem('assembleSubmitButton', button);

    let githubAuthButton = this.createGitAuthButton(authCallback);
    panel.toolbar.addItem('githubAuthButton', githubAuthButton);

    async function authCallback(popup?: Window, authIntervalId?: number) {
      const authenticated = await isAuthenticated();
      githubAuthButton.toggleClass(
        'assemble-githubAuthButtonIcon-authenticated',
        authenticated
      );
      if (authenticated) {
        // githubAuthButton.update = 'Already authenticated with GitHub';
        if (authIntervalId) {
          clearInterval(authIntervalId);
        }
        if (popup && !popup.closed) {
          popup.close();
        }
      }
    }

    // check for previously successful authentication immediately to apply the appropriate button class
    authCallback().catch(console.warn);

    return new DisposableDelegate(() => {
      button.dispose();
      githubAuthButton.dispose();
    });
  }

  private createGitAuthButton(
    authCallback: (popup?: Window, authIntervalId?: number) => Promise<void>
  ) {
    let githubAuthButton = new ToolbarButton({
      iconClass: 'fa fa-github assemble-githubAuthButtonIcon',
      onClick: async () => {
        if (!(await isAuthenticated())) {
          const popup = window.open(
            getEndpointUrl('auth/authorize'),
            '_blank',
            'width=350,height=600'
          );
          // async
          void request<void>('auth/token', {
            method: 'POST'
          });

          let authIntervalId;
          authIntervalId = setInterval(
            authCallback,
            0.5 * ONE_SECOND,
            popup,
            authIntervalId
          );
        } else {
          void showDialog({
            title: 'Already authenticated',
            body: 'You have successfully authenticated with GitHub.',
            buttons: [Dialog.okButton()]
          });
        }
      },
      tooltip: 'Authenticate with GitHub'
    });
    return githubAuthButton;
  }

  private createSubmitButton(panel: NotebookPanel) {
    let button = new ToolbarButton({
      label: 'Submit',
      icon: new LabIcon({
        name: 'ballet-icon',
        svgstr: balletIconSvg
      }),
      onClick: async () => {
        // check if authenticated
        if (!(await isAuthenticated())) {
          void showErrorMessage(
            'Not authenticated',
            "You're not authenticated with GitHub - click the GitHub icon in the toolbar to connect!"
          );
          return;
        }

        // load current cell
        let notebook = panel.content;
        let activeCell = notebook.activeCell;
        let contents = activeCell.model.value.text;

        // confirm to proceed
        const confirmDialog = await showDialog({
          title: 'Submit feature?',
          body: new ConfirmWidget(contents)
        });
        if (!confirmDialog.button.accept) {
          return;
        }

        await this.submitContentToServer(contents);
      },
      tooltip: 'Submit current cell to Ballet project'
    });
    return button;
  }

  private async submitContentToServer(contents: string) {
    // post contents to server
    console.log(contents);
    const result: ISubmissionResponse = await submit(contents);

    // try to add a message to cell outputs
    if (result.result) {
      void showDialog({
        title: 'Feature submitted successfully',
        body: new FeatureSubmittedOkayWidget(result.url),
        buttons: [Dialog.okButton()]
      });
    } else {
      const message =
        result.message !== undefined && result.message !== null
          ? `: ${result.message}.`
          : '.';
      void showErrorMessage(
        'Error submitting feature',
        `Oops - there was a problem submitting your feature${message}`
      );
      console.error(result);
    }
  }

  private createSliceButton(panel: NotebookPanel) {
    let button = new ToolbarButton({
      label: 'Slice',
      /*icon: new LabIcon({
        name: 'ballet-icon',
        svgstr: balletIconSvg
      }),*/
      onClick: async () => {
        let notebook = panel.content;
        let cells = panel.content.model.cells;

        // load current cell and check if it contains code
        let activeCell = notebook.activeCell.model.value.text.toString();
        if (
          activeCell === null ||
          activeCell.length === null ||
          activeCell.trim() === '' ||
          notebook.activeCell.model.type !== 'code'
        ) {
          alert(
            'Selected cell does not have any code content. Slice cannot be obtained.'
          );
          return;
        }

        let content = [];
        for (let i = 0; i < cells.length; i++) {
          if (cells.get(i).type === 'code') {
            content.push(cells.get(i).value.text);
          }
        }
        let ctsJoined = content.join('\n');
        let ctsSplit = ctsJoined.split('\n');

        // use parse(array) to generate tree
        let tree = parse(ctsJoined);
        let loc;
        try {
          loc = getLocationFromCurrentCell(activeCell, ctsSplit);
        } catch (e) {
          alert(e.message);
        }

        let slicedLoc = slice(tree, loc);

        let result;
        try {
          result = getCodeFromSlice(slicedLoc, ctsSplit);
        } catch (e) {
          alert(e.message);
        }

        const finalDialog = await showDialog({
          title:
            'Here is you code slice. Click OK to submit it to your upstream GitHub Repository!',
          body: new ConfirmWidget(result)
        });
        if (!finalDialog.button.accept) {
          return;
        }

        if (!(await isAuthenticated())) {
          void showErrorMessage(
            'Not authenticated',
            "You're not authenticated with GitHub - click the GitHub icon in the toolbar to connect!"
          );
          return;
        }
        await this.submitContentToServer(result);
      },
      tooltip: 'Slice code of current cell'
    });
    return button;
  }

  /* description: Takes the set of locations returned by slice() and extract the given locations from the original code stored in ctsSplit.
   * Every location contains the "line" attribute, which indicates the code line that was extracted (count starts at 1).
   * Since the ctsSplit array starts at 0, an index shift needs to be performed: line = 1 of a location corresponds to
   * ctsSplit[0].
   * slicedLoc: a set of locations that indicates which entries of ctsSplit are code dependencies
   * ctsSplit: an array that contains the code of the current notebook, each entry corresponds to one line of code
   * returns: a string array of the code lines that were marked in slicedLoc */
  /*public getCodeFromSlice(slicedLoc: LocationSet, ctsSplit: string[]) {
    return func(ctsSplit, slicedLoc);
  }*/

  /*
   * description: Returns the location (e.g. {first_line: 6, first_column: 0, last_line: 6, last_column: 10}
   * line 6 from char 0 to char 10 (include eol)) of the currently active cell
   * activeCell: currently active cell
   * content: array containing all lines of code of the notebook
   * returns: set of locations, whose first_line elem mark the lines that should be included */
  /*  public getLocationFromCurrentCell(activeCell: any, content: String[]) {
    return func(activeCell, content);
  }*/
}

async function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  settingRegistry: ISettingRegistry
): Promise<void> {
  console.log(`JupyterLab extension ${EXTENSION_NAME} is activated!`);
  // add button to toolbar
  app.docRegistry.addWidgetExtension(
    'Notebook',
    new AssembleSubmitButtonExtension(settingRegistry)
  );

  // create submit command
  const submitCommand: string = 'assemble:submit';
  app.commands.addCommand(submitCommand, {
    label: 'Submit Feature',
    execute: () => {
      console.log('Submit feature executed (TODO)');
    }
  });
  palette.addItem({ command: submitCommand, category: 'Assemble' });

  // check status of /assemble endpoints
  try {
    await checkStatus();
    console.log('Connected to /assemble endpoints');
  } catch {
    console.error("Can't connect to /assemble endpoints");
  }
}

/**
 * Initialization data for the ballet-assemble extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [ICommandPalette, ISettingRegistry],
  activate: activate
};

export default extension;
