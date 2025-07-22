//document.getElementById('upload').addEventListener('change', handleFile, false);

let g; // Variável global para o grupo principal
const width = 1700;
const height = 700;
const rectWidth = 240;
const rectHeight = 130;
const textMargin = 5;
const fontSize = 8;
const maxCharsPerLine = 40;
const margin = { top: 50, right: 50, bottom: 50, left: 50 };
const initialScale = 0.7;
const svgWidth = width + margin.left + margin.right;
const svgHeight = height + margin.top + margin.bottom;
const zoom = d3.zoom()
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
    });
const maxdepth = 5;
const maxNodesPerRow = 3;
let maxLevel = 10;
const minLevel = 5;
let rootNode;
let allData = [];
let focusedNode = null;
let originalData = [];
let isFilterEmployeeActive = false;
let isUsingExcel = false;  // Tracks whether the user uploaded an Excel file
let lastUploadedFile = null; // Stores the last uploaded Excel file

function addContextMenu(nodeData) {
    // Remove any existing context menu
    d3.select('#context-menu').remove();

    // Create the context menu container
    const menu = d3.select('body')
        .append('div')
        .attr('id', 'context-menu');

    // Define menu options
    const menuOptions = [
        { 
            label: 'Unlink person', 
            url: `https://airtable.com/appizN81F0lGGAHwr/paghdT4PEQZdcvWdJ/form?hide_Request+type=true&prefill_Position=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Orgchart_ID_history=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Badge+number=${encodeURIComponent(nodeData.data["Current badge number"])}&hide_Orgchart_ID_history=true&hide_Badge+number=true`,
            helperText: `Remove ${nodeData.data["Current name"]} from ${nodeData.data["Position"]}`,
            enabled: !isUsingExcel && nodeData.data.Status !== 'Vacant' // Enabled only if node is not Vacant
        },
        { 
            label: 'Link person', 
            url: `https://airtable.com/appizN81F0lGGAHwr/pagLuqBIw8ojoIW5q/form?hide_Request+type=true&prefill_Position=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Orgchart_ID_history=${encodeURIComponent(nodeData.data["Position ID"])}&hide_Orgchart_ID_history=true`,
            helperText: `Assign a person to ${nodeData.data["Position"]}`,
            enabled: !isUsingExcel && nodeData.data.Status === 'Vacant' // Enabled only if node is Vacant
        },
        { 
            label: 'Create new position', 
            url: `https://airtable.com/appizN81F0lGGAHwr/pagnYoWst0u2DsxH7/form?hide_Request+type=true&prefill_Superior=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Orgchart_ID_history=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_New+cost+center=${encodeURIComponent(nodeData.data["Cost center"])}&hide_Orgchart_ID_history=true`,
            helperText: `Add a new position under ${nodeData.data["Current name"]}`,
            enabled: !isUsingExcel
        },
        { 
            label: 'Remove position', 
            url: `https://airtable.com/appizN81F0lGGAHwr/pagRPNF3WVxinvpt0/form?hide_Request+type=true&prefill_Position=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Orgchart_ID_history=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Origin+cost+center=${encodeURIComponent(nodeData.data["Cost center"])}&hide_Orgchart_ID_history=true&hide_Origin+cost+center=true`,
            helperText: `Delete ${nodeData.data["Position"]} from the chart`,
            enabled: !isUsingExcel
        },
        { 
            label: 'Modify position attributes', 
            url: `https://airtable.com/appizN81F0lGGAHwr/pagWQ6JZzkh5v18r8/form?hide_Request+type=true&prefill_Position=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Title=${encodeURIComponent(nodeData.data["Position"]).toUpperCase()}&prefill_Cost+center=${encodeURIComponent(nodeData.data["Cost center"])}&prefill_Category=${encodeURIComponent(nodeData.data["Current category"])}&prefill_Origin+cost+center=${encodeURIComponent(nodeData.data["Cost center"])}&prefill_Orgchart_ID_history=${encodeURIComponent(nodeData.data["Position ID"])}&hide_Orgchart_ID_history=true&hide_Origin+cost+center=true`,
            helperText: `Modify ${nodeData.data["Position"]}`,
            enabled: !isUsingExcel
        },
        { 
            label: 'Transfer position', 
            url: `https://airtable.com/appizN81F0lGGAHwr/pagJaUiMNVijIt523/form?hide_Request+type=true&prefill_Position=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_New+cost+center=${encodeURIComponent(nodeData.data["Cost center"])}&prefill_Origin+cost+center=${encodeURIComponent(nodeData.data["Cost center"])}&prefill_Orgchart_ID_history=${encodeURIComponent(nodeData.data["Position ID"])}&hide_Orgchart_ID_history=true&hide_Origin+cost+center=true`,
            helperText: `Transfer ${nodeData.data["Position"]} to another hierarchy`,
            enabled: !isUsingExcel
        },
        { 
            label: 'Link acting person', 
            url: `https://airtable.com/appizN81F0lGGAHwr/pagjFo2VpO9RhWe4O/form?hide_Request+type=true&prefill_Position=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Orgchart_ID_history=${encodeURIComponent(nodeData.data["Position ID"])}&hide_Orgchart_ID_history=true`,
            helperText: `Assign an acting person to ${nodeData.data["Position"]}`,
            enabled: !isUsingExcel && !nodeData.data["Acting (badge and name)"]
        },
        { 
            label: 'Unlink acting person', 
            url: `https://airtable.com/appizN81F0lGGAHwr/pagtQVL6T8KKWLtzV/form?hide_Request+type=true&prefill_Position=${encodeURIComponent(nodeData.data["Position ID"])}&prefill_Orgchart_ID_history=${encodeURIComponent(nodeData.data["Position ID"])}&hide_Orgchart_ID_history=true`,
            helperText: `Unassign an acting person from ${nodeData.data["Position"]}`,
            enabled: !isUsingExcel && nodeData.data["Acting (badge and name)"]
        }
    ];

    // Dynamically add menu items
    menuOptions.forEach(option => {
        const menuItem = menu.append('div')
            .text(option.label)
            .attr('data-helper-text', option.helperText) // Add helper text as a data attribute
            .classed('disabled', !option.enabled); // Add "disabled" class if the option is not enabled

        if (option.enabled) {
            // Add click event only if the option is enabled
            menuItem.on('click', () => {
                window.open(option.url, '_blank');
            });
        }
    });

    // Hide menu when clicking outside
    d3.select('body').on('click.context-menu', () => {
        d3.select('#context-menu').style('display', 'none');
    });
}

function setupNodeRightClickHandler() {
    d3.selectAll('.node')
        .on('contextmenu', function(event, d) {
            event.preventDefault();
            event.stopPropagation();

            // Ignore Placeholder or Wrapper nodes
            if (d.data.Position === 'Placeholder' || d.data.Position === 'Wrapper') return;

            // Show the custom context menu
            const menu = d3.select('#context-menu')
                .style('display', 'block')
                .style('left', `${event.pageX}px`)
                .style('top', `${event.pageY}px`);

            // Populate menu based on node data
            addContextMenu(d);
        });
}

// Create the message box for orgchart source
function showMessageBoxLoadOrgchart() {
    const overlay = document.createElement("div");
    overlay.id = "message-box-overlay";

    const messageBox = document.createElement("div");
    messageBox.id = "message-box";

    // Add the text
    const text = document.createElement("p");
    text.textContent = "You can import your own orgchart. Download the template, input your data and upload the file.";
    messageBox.appendChild(text);

    // Create the "Download template" button
    const downloadButton = document.createElement("button");
    downloadButton.textContent = "Download template";
    downloadButton.onclick = () => {
        const link = document.createElement("a");
        link.href = "./Orgchart Template.xlsx"; // Path to the file
        link.download = "Orgchart Template.xlsx"; // Suggested file name
        link.click(); // Trigger the download
        closeMessageBox(); // Close the message box
    };

    // Create the "Upload file" button
    const uploadButton = document.createElement("button");
    uploadButton.textContent = "Upload file";
    uploadButton.onclick = () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".xlsx"; // Restrict to Excel files
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                isFilterEmployeeActive = false;
                document.getElementById("filter-ambatovy-btn").textContent = "Employees";
                document.getElementById("filter-ambatovy-btn").style.backgroundColor = "";
                maxLevel = 10;
                await processExcelFile(file); // Process the uploaded file
                closeMessageBox(); // Close the message box
                //toggleLoadOrgchartButton(); // Toggle button state
            }
        };
        fileInput.click(); // Trigger file selection dialog
    };

    // Add buttons to the message box
    messageBox.appendChild(downloadButton);
    messageBox.appendChild(uploadButton);

    // Add the message box to the overlay
    overlay.appendChild(messageBox);

    // Append overlay to body
    document.body.appendChild(overlay);

    // Close the message box when ESC is pressed
    const escListener = (event) => {
        if (event.key === "Escape") {
            closeMessageBox();
        }
    };
    document.addEventListener("keydown", escListener);

    // Close the message box when clicking outside the box
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeMessageBox();
        }
    });

    // Function to close the message box and clean up event listeners
    function closeMessageBox() {
        document.body.removeChild(overlay);
        document.removeEventListener("keydown", escListener);
    }
}

function recreateOrgChart(data) {
    restoreOriginalView();
    document.getElementById("controls-container").style.display = "none";
    document.getElementById("loading-container").style.display = "block";

    // Extract all valid IDs
    let validIds = new Set(data.map((d) => d.ID));

    // Identify positions with invalid "Reports to" references
    let invalidNodes = data.filter(d => d["Reports to"] && !validIds.has(d["Reports to"]));

    if (invalidNodes.length > 0) {
        const errorMessage = `The following positions have an invalid "Reports to" reference and will be excluded along with their descendants:\n\n\n` +
            invalidNodes.map(d => `Badge: ${d["Current badge number"]}\nInvalid ID on "Reports to" column: ${d["Reports to"]}`).join("\n\n");

        alert(errorMessage);
    }

    // Remove invalid nodes and all their descendants
    const invalidIds = new Set(invalidNodes.map(d => d.ID));

    function removeInvalidNodesAndDescendants(nodes) {
        let filteredNodes = nodes.filter(d => !invalidIds.has(d.ID)); // Remove top-level invalid nodes

        let lastCount;
        do {
            lastCount = filteredNodes.length;
            const currentValidIds = new Set(filteredNodes.map(d => d.ID));
            
            // Remove any node that reports to an invalid or already removed parent
            filteredNodes = filteredNodes.filter(d => !d["Reports to"] || currentValidIds.has(d["Reports to"]));
        } while (filteredNodes.length !== lastCount); // Repeat until no changes

        return filteredNodes;
    }

    let filteredData = removeInvalidNodesAndDescendants(data);

    // Ensure we still have valid data
    if (filteredData.length === 0) {
        alert("Error: No valid positions remain after filtering. The original org chart will be restored.");
        loadFile(); // Restore from Airtable
        return;
    }

    filteredData.forEach(node => {
        node.Level = parseInt(node.Level) || 0;
    });

    // Create rootNode using d3.stratify
    let rootNode;
    try {
        rootNode = d3.stratify()
            .id(d => d.ID)
            .parentId(d => d["Reports to"])(filteredData);
    } catch (error) {
        console.error("Error in d3.stratify:", error);
        alert("An error occurred while processing the org chart hierarchy. The original org chart will be restored.");
        loadFile(); // Restore from Airtable
        return;
    }

    // Assign missing levels
    const adjustedData = assignLevelsBasedOnDepth(filteredData, rootNode);

    // Adjust levels to a maximum of 10
    const adjustedWithLevels = adjustLevels(adjustedData);

    // Add wrapper nodes if needed
    const withWrapperNodes = addWrapperNodes(adjustedWithLevels, maxNodesPerRow);

    // Add invisible nodes where necessary
    const processedData = createInvisibleNodes(withWrapperNodes);

    allData = processedData; // Update global data reference
    buildOrgChart(processedData); // Rebuild the org chart

    document.getElementById("controls-container").style.display = "flex";
    document.getElementById("loading-container").style.display = "none";
}

// Toggle the buttons for Load Orgchart or Get from Airtable
function toggleOrgchartButtons() {
    const exportContainer = document.getElementById("export-load");
    // Remove any existing orgchart buttons (you can mark them with a common class)
    const existingButtons = exportContainer.querySelectorAll("button.orgchart-btn");
    existingButtons.forEach(btn => btn.remove());
    
    if (isUsingExcel) {
      // Create Back to Main Orgchart button
      const backButton = document.createElement("button");
      backButton.id = "back-to-main-orgchart-button";
      backButton.classList.add("orgchart-btn");
      backButton.textContent = "Back to Main";
      backButton.onclick = loadFile;  // Reloads data from Airtable
      exportContainer.appendChild(backButton);
      
      // Create Upload new orgchart button
      const uploadButton = document.createElement("button");
      uploadButton.id = "upload-new-orgchart-button";
      uploadButton.classList.add("orgchart-btn");
      uploadButton.textContent = "Load orgchart";
      uploadButton.onclick = showMessageBoxLoadOrgchart;  // Opens file upload dialog
      exportContainer.appendChild(uploadButton);
    } else {
      // When using Airtable, just show "Load your own orgchart"
      const loadButton = document.createElement("button");
      loadButton.id = "load-orgchart-button";
      loadButton.classList.add("orgchart-btn");
      loadButton.textContent = "Load orgchart";
      loadButton.onclick = showMessageBoxLoadOrgchart;
      exportContainer.appendChild(loadButton);
    }
  }  

// Add event listener for the "Load your own orgchart" button
document.getElementById("load-orgchart-button").addEventListener("click", showMessageBoxLoadOrgchart);

function truncateText(text, maxChars) {
    return text.length > maxChars ? text.slice(0, maxChars - 1) + "." : text;
}

// Function to export visible nodes to XLSX
function exportVisibleNodesToXLSX() {
    const startNode = (focusedNode ? focusedNode : rootNode);

    // Get all visible nodes (excluding Placeholders and Wrappers)
    const visibleNodes = startNode.descendants().filter(node => 
        node.data.Position !== "Placeholder" && 
        node.data.Position !== "Wrapper"
    );

    // Extract the visible IDs
    const visibleIDs = new Set(visibleNodes.map(node => node.data.ID));

    // Filter original data to include only visible IDs
    const filteredData = originalData.filter(d => visibleIDs.has(d.ID));
    console.table(filteredData);

    // Define the XLSX columns (including the two new ones)
    const xlsxHeaders = [
        "ID",
        "Cost center",
        "CC code",
        "Position",
        "Current badge number",
        "Current name",
        "Current category",
        "Person category",
        "Acting (badge and name)",
        "Acting person category",
        "Status",
        "Reports to",
        "Level"
    ];

    // Prepare the data rows
    const xlsxRows = filteredData.map(data => {
        const parentNode = filteredData.find(parent => parent.ID === data["Reports to"]);
        return [
            data["Position ID"] ? data["Position ID"].replace(/"/g, '') : "",
            data["Cost center"] || "",
            data["CC code"] || "",
            data.Position ? data.Position.replace(/"/g, '') : "",
            data["Current badge number"] || "",
            data["Current name"] || "",
            data["Current category"] || "",
            data["Person category"] || "",
            data["Acting (badge and name)"] || "", // Capture the new field
            data["Acting person category"] || "",  // Capture the new field
            data.Status || "",
            parentNode ? parentNode["Position ID"].replace(/"/g, '') : "",
            data.Level || ""
        ];
    });

    // Combine headers and rows into an array format for XLSX
    const worksheetData = [xlsxHeaders, ...xlsxRows];

    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Export");

    // Create and trigger the file download
    XLSX.writeFile(wb, "Export.xlsx");
}

// Function to assign levels based on node depth + 5 for nodes without a defined level
function assignLevelsBasedOnDepth(data, rootNode) {
    // Traverse all nodes to set levels for those without an assigned level
    rootNode.each(node => {
        if (!node.data.Level) { // Check if the level is not defined
            node.data.Level = node.depth + minLevel; // Set level as depth + minimum level
        }
    });

    // Update the original data array with the assigned levels
    data.forEach(node => {
        const correspondingNode = rootNode.descendants().find(n => n.data.ID === node.ID);
        if (correspondingNode) {
            node.Level = correspondingNode.data.Level;
        }
    });

    return data;
}

// Function to adjust levels of nodes to a maximum of 10 and update parent
function adjustLevels(data) {
    data.forEach(node => {
        // Check if the node level is greater than maxLevel
        if (node.Level >= maxLevel) {
            node.Level = maxLevel; // Cap the level at maxLevel
            // Find the nearest parent node at level maxLevel-1
            let currentParent = data.find(d => d.ID === node["Reports to"]);
            while (currentParent && (currentParent.Level > (maxLevel-1))) {
                currentParent = data.find(d => d.ID === currentParent["Reports to"]);
                if(node.ID === "43870 - LEAD KITTER - 3539"){
                    console.log(`Serching...`);
                    console.log(`Analyzing: ${currentParent.ID}`);
                    console.log(`Analyzed level: ${currentParent.Level}`);
                    console.log(`End of search...`);
                }
            }
            if (currentParent) {
                node["Reports to"] = currentParent.ID;
            }
        }
        if(node.ID === "43870 - LEAD KITTER - 3539"){
            console.log(`After is: ${node["Reports to"]}`);
            console.log(`node level: ${node.Level}`);
        }
    });
    return data;
}

function addWrapperNodes(data, maxNodesPerRow) {
    let idCounter = 1; // Comece com um número arbitrário para os wrappers
    const newNodes = [];

    data.forEach(node => {
        if (node.Level <= maxLevel - 1) {
            let children = data.filter(n => 
                n.Level === maxLevel && 
                n["Reports to"] === node.ID && 
                n.Position !== "Placeholder"
            );

            let currentParentID = node.ID;

            // Process children in batches
            while (children.length > 0) {
                // Get a batch of up to maxNodesPerRow real nodes
                const batch = children.splice(0, maxNodesPerRow);

                // Update the parent of the batch to the current parent node
                batch.forEach(child => child["Reports to"] = currentParentID);

                // If there are more children left, create 3 wrapper nodes
                if (children.length > 0) {
                    const wrapperNodes = [];
                    const middleIndex = Math.floor(batch.length / 2);
                    currentParentID = batch[middleIndex].ID;

                    // Create 3 wrapper nodes
                    for (let i = 0; i < 3; i++) {
                        const wrapperNode = {
                            ID: `wrapper-${idCounter}`,
                            "Cost center": "Wrapper",
                            Position: "Wrapper",
                            "Current badge number": "",
                            "Current name": "",
                            "Reports to": currentParentID,
                            "Current category": "",
                            Status: "",
                            Level: maxLevel // Keep the same level as children
                        };
                        wrapperNodes.push(wrapperNode);
                        newNodes.push(wrapperNode);
                        idCounter++;
                    }

                    // Set the middle wrapper as the new parent for the next batch
                    currentParentID = wrapperNodes[1].ID;
                }
            }
        }
    });

    // Return the original data plus new wrapper nodes
    return [...data, ...newNodes];
}

function createInvisibleNodes(data) { 
    let idCounter = 1;

    data.forEach(node => {
        let currentNode = node;
        // Traverse up the hierarchy to check for level gaps
        while (currentNode["Reports to"] !== undefined) {
            const parentNode = data.find(d => d.ID === currentNode["Reports to"]);
            // Check if there is a level gap between the current node and its parent
            if (parentNode && (parentNode.Level + 1 < currentNode.Level)) {
                let levelGap = currentNode.Level - parentNode.Level;
                // Create only one invisible node for each level gap
                let invisibleNode = data.find(d => 
                    d.Position === "Placeholder" && 
                    d.Level === parentNode.Level + levelGap && 
                    d["Reports to"] === parentNode.ID
                );
                // If no existing invisible node is found, create a new one
                if (!invisibleNode || levelGap > 1) {
                    invisibleNode = {
                        ID: `placeholder-${idCounter++}`,
                        "Cost center": "Invisible",
                        Position: "Placeholder",
                        "Current badge number": "",
                        "Current name": "",
                        "Reports to": parentNode.ID,
                        "Current category": "",
                        Status: "",
                        Level: currentNode.Level - 1 // Place it at one level above current node
                    };
                    // Add the invisible node to the data list
                    data.push(invisibleNode);
                }

                // Update the parent of the current node to the newly created invisible node
                currentNode["Reports to"] = invisibleNode.ID;

                // Move up the hierarchy by setting the invisible node as the current node
                currentNode = invisibleNode;
            } else {
                // Stop if no level gap or no valid parent is found
                break;
            }
        }
    });

    return data;
}

async function fetchData() {
    isUsingExcel = false;
    const BASE_ID = "appizN81F0lGGAHwr";
    const TABLE_ID_MAIN  = "tblLq0tcPRvqDgx5o";
    //const TABLE_ID_POSITIONS = "tblv8p8SPlXCGjIiz";
    //const TABLE_ID_COST_CENTERS = "tblN6zVmJ9dMqQI6v";
    const PERSONAL_ACCESS_TOKEN = "patnqCdAaiq7guObx.226bdff85d76448ab468ad965153ee02fe6f8670c09c3cc22f2cd559bd7a78d3";

    const fetchAirtableData = async (tableId) => {
        let allRecords = [];
        let offset = "";

        try {
            do {
                const usedFields = [
                    "ID",
                    "Structure level",
                    "Reports to",
                    "Acting (badge and name)",
                    "Acting person category",
                    "Cost center - text",
                    "Position - text",
                    "CC code",
                    "Current badge number",
                    "Current name",
                    "Current category",
                    "Person category",
                    "Status"
                ];

                const queryParams = new URLSearchParams();
                if (offset) queryParams.append("offset", offset);
                usedFields.forEach(field => queryParams.append("fields[]", field));

                queryParams.append("pageSize", "100"); // Batch size
                const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${queryParams.toString()}`;

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${PERSONAL_ACCESS_TOKEN}`,
                    },
                });

                if (!response.ok) {
                    console.error(`Error fetching ${tableId}: ${response.status} - ${response.statusText}`);
                    return [];
                }

                const json = await response.json();
                allRecords = allRecords.concat(json.records);
                offset = json.offset || "";
            } while (offset);

            return allRecords;
        } catch (error) {
            console.error(`Error fetching ${tableId}:`, error);
            return [];
        }
    };

    try {
        const mainRecords = await fetchAirtableData(TABLE_ID_MAIN);
        //const positionRecords = await fetchAirtableData(TABLE_ID_POSITIONS);
        //const costCenterRecords = await fetchAirtableData(TABLE_ID_COST_CENTERS);

        if (!mainRecords.length) {
            console.warn("No data fetched from the main table.");
            return [];
        }

        let adjustedRecords = mainRecords.map((record) => {
            const fields = { ...record.fields };

            fields["Position ID"] = fields["ID"] || ""; // Rename "ID" to "Position ID"
            fields["ID"] = record.id; // Use the record's ID for the new "ID" column
            fields["Level"] = fields["Structure level"] || ""; // Rename "Structure level" to "Level"
            fields["Acting (badge and name)"] = fields["Acting (badge and name)"] || ""; // Capture Acting (badge and name)
            fields["Acting person category"] = fields["Acting person category"] || ""; // Capture Acting person category
            fields["Cost center"] = fields["Cost center - text"] || "";
            fields["Position"] = fields["Position - text"] || "";
            delete fields["Structure level"]; // Remove the old "Structure level" column
            delete fields["Cost center - text"];
            delete fields["Position - text"];
            return {
                id: record.id, // Keep the original record ID
                fields: fields, // Use the updated fields
            };
        });

        const mainMap = Object.fromEntries(mainRecords.map((record) => [record.id, record.fields.ID || ""]));
        //const positionMap = Object.fromEntries(positionRecords.map((record) => [record.id, record.fields.Name || ""]));
        //const costCenterMap = Object.fromEntries(costCenterRecords.map((record) => [record.id, record.fields["Cost center ID"] || ""]));

        adjustedRecords = adjustedRecords.map((record) => {
            const fields = { ...record.fields };

            //fields["Position"] = fields["Position"]?.map((id) => positionMap[id] || id).join(", ") || "";
            //fields["Cost center"] = fields["Cost center"]?.map((id) => costCenterMap[id] || id).join(", ") || "";
            fields["Reports to (position)"] = fields["Reports to"]
                ?.map((id) => mainMap[id] || "problem")
                .join(", ") || "";
            return {
                id: record.id,
                fields: fields,
            };
        });

        // Filter records where "Reports to" is blank, except when "Cost center" is "68800 - Operations Management"
        adjustedRecords = adjustedRecords.filter((record) => {
            const reportsTo = record.fields["Reports to"];
            const costCenter = record.fields["Cost center"];
            return reportsTo || costCenter === "68800 - Operations Management";
        });

        // Ensure all fields are strings, replacing empty or invalid values with ""
        adjustedRecords = adjustedRecords.map(record => {
            const fields = { ...record.fields };
            Object.keys(fields).forEach(key => {
                if (typeof fields[key] !== "string") {
                    fields[key] = fields[key] ? fields[key].toString() : "";
                }
            });
            return {
                id: record.id, // Keep the original record ID
                fields: fields // Use the updated fields
            };
        });

        return adjustedRecords; // Make sure to return the final array
    } catch (error) {
        console.error("Error in fetchData:", error);
        return [];
    }
}

document.addEventListener("DOMContentLoaded", loadFile);

document.getElementById("filter-ambatovy-btn").addEventListener("click", function () {
    restoreOriginalView();
    //console.log(isUsingExcel)
    if (!isFilterEmployeeActive) {
        filterAmbatovyEmployees();
        this.textContent = "Show All";
        this.style.backgroundColor = "#ccc"; // Change color when active
    } else {
        reloadFullOrgChart(); // Reset to full data
        this.textContent = "Employees";
        this.style.backgroundColor = ""; // Reset color
    }
    isFilterEmployeeActive = !isFilterEmployeeActive; // Toggle filter state
});

function filterAmbatovyEmployees() {
    document.getElementById("controls-container").style.display = "none";
    document.getElementById("loading-container").style.display = "block";

    if (isUsingExcel && lastUploadedFile) {
        // Reload from the last uploaded Excel file and filter employees
        processExcelFile(lastUploadedFile, true); // Pass a flag to indicate filtering
    } else {
        // Fetch from Airtable and filter employees
        fetchData().then((allRecords) => {
            if (!allRecords || allRecords.length === 0) {
                console.warn("No valid data to process.");
                return;
            }

            let jsonData = allRecords.map(record => record.fields);

            // Filter only Ambatovy employees
            jsonData = jsonData.filter(d => 
                d["Current category"] === "National Employee" || 
                d["Current category"] === "Expatriate Employee" || 
                d["Current category"] === "PN External" || 
                d["Current category"] === "Trainee / Intern"
            );

            const validIds = new Set(jsonData.map(d => d.ID));
            jsonData = jsonData.filter(d => !d["Reports to"] || validIds.has(d["Reports to"]));

            jsonData.forEach(node => {
                node.Level = parseInt(node.Level) || 0;
            });

            const rootNode = d3.stratify()
                .id(d => d.ID)
                .parentId(d => d["Reports to"])(jsonData);

            jsonData = assignLevelsBasedOnDepth(jsonData, rootNode);
            jsonData.forEach(node => {
                node.originalLevel = node.Level;
            });

            jsonData.sort((a, b) => {
                const levelComparison = parseInt(a.originalLevel, 10) - parseInt(b.originalLevel, 10);
                if (levelComparison !== 0) {
                    return levelComparison;
                }
                return a.Position.localeCompare(b.Position);
            });

            jsonData = adjustLevels(jsonData);
            jsonData = addWrapperNodes(jsonData, maxNodesPerRow);
            const processedData = createInvisibleNodes(jsonData);

            allData = processedData;
            buildOrgChart(processedData);

            const RealNodes = processedData.filter(n => 
                n.Position !== 'Placeholder' && 
                n.Position !== 'Wrapper'
            );
            updateCategorySummary(RealNodes);
        }).catch(error => console.error("Error fetching data:", error))
        .finally(() => {
            document.getElementById("loading-container").style.display = "none";
            document.getElementById("controls-container").style.display = "flex";
        });
    }
}

function reloadFullOrgChart() {
    document.getElementById("controls-container").style.display = "none";
    document.getElementById("loading-container").style.display = "block";

    if (isUsingExcel && lastUploadedFile) {
        // Reload the full data from the uploaded Excel file
        processExcelFile(lastUploadedFile, false);
    } else {
        // Reload the full data from Airtable
        fetchData().then((allRecords) => {
            if (!allRecords || allRecords.length === 0) {
                console.warn("No valid data to process.");
                return;
            }

            let jsonData = allRecords.map(record => record.fields);

            const validIds = new Set(jsonData.map(d => d.ID));
            jsonData = jsonData.filter(d => !d["Reports to"] || validIds.has(d["Reports to"]));

            jsonData.forEach(node => {
                node.Level = parseInt(node.Level) || 0;
            });

            const rootNode = d3.stratify()
                .id(d => d.ID)
                .parentId(d => d["Reports to"])(jsonData);

            jsonData = assignLevelsBasedOnDepth(jsonData, rootNode);
            jsonData.forEach(node => {
                node.originalLevel = node.Level;
            });

            jsonData.sort((a, b) => {
                const levelComparison = parseInt(a.originalLevel, 10) - parseInt(b.originalLevel, 10);
                if (levelComparison !== 0) {
                    return levelComparison;
                }
                return a.Position.localeCompare(b.Position);
            });

            jsonData = adjustLevels(jsonData);
            jsonData = addWrapperNodes(jsonData, maxNodesPerRow);
            const processedData = createInvisibleNodes(jsonData);

            allData = processedData;
            buildOrgChart(processedData);

            const RealNodes = processedData.filter(n => 
                n.Position !== 'Placeholder' && 
                n.Position !== 'Wrapper'
            );
            updateCategorySummary(RealNodes);
        }).catch(error => console.error("Error fetching data:", error))
        .finally(() => {
            document.getElementById("loading-container").style.display = "none";
            document.getElementById("controls-container").style.display = "flex";
        });
    }
}

// Modify processExcelFile to allow filtering employees
async function processExcelFile(file, filterEmployees = false) {
    lastUploadedFile = file;
    isUsingExcel = true;
    
    document.getElementById("export-button").style.display = "none";

    const reader = new FileReader();

    reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        let jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });

        if (filterEmployees) {
            jsonData = jsonData.filter(d => 
                d["Current category"] === "National Employee" || 
                d["Current category"] === "Expatriate Employee" || 
                d["Current category"] === "PN External" || 
                d["Current category"] === "Trainee / Intern"
            );
        }

        // Ensure the two new columns are captured properly
        jsonData.forEach(node => {
            node["Acting (badge and name)"] = node["Acting (badge and name)"] || ""; // Ensure it's included
            node["Acting person category"] = node["Acting person category"] || "";  // Ensure it's included
        });

        const validIds = new Set(jsonData.map(d => d.ID));
        jsonData = jsonData.filter(d => !d["Reports to"] || validIds.has(d["Reports to"]));

        jsonData.forEach(node => {
            node.Level = parseInt(node.Level) || 0;
        });

        const rootNode = d3.stratify()
            .id(d => d.ID)
            .parentId(d => d["Reports to"])(jsonData);

        jsonData = assignLevelsBasedOnDepth(jsonData, rootNode);
        jsonData = adjustLevels(jsonData);
        jsonData = addWrapperNodes(jsonData, maxNodesPerRow);
        const processedData = createInvisibleNodes(jsonData);

        allData = processedData;
        buildOrgChart(processedData);

        const RealNodes = processedData.filter(n => 
            n.Position !== 'Placeholder' && 
            n.Position !== 'Wrapper'
        );
        updateCategorySummary(RealNodes);
    };

    reader.readAsArrayBuffer(file);

    // Ensure the loading screen disappears after processing
    reader.onloadend = () => {
        document.getElementById("loading-container").style.display = "none";
        document.getElementById("controls-container").style.display = "flex";
    };

    toggleOrgchartButtons();
}

async function loadFile() {

    isUsingExcel = false;  // Reset flag when loading from Airtable
    lastUploadedFile = null;  // Clear last uploaded file
    isFilterEmployeeActive = null;
    maxLevel = 10;

    document.getElementById("controls-container").style.display = "none";
    document.getElementById("loading-container").style.display = "block";
    document.getElementById("filter-ambatovy-btn").textContent = "Employees";
    document.getElementById("filter-ambatovy-btn").style.backgroundColor = "";
    document.getElementById("export-button").style.display = "block";


    try {
        // Fetch data using the updated fetchData function
        const adjustedRecords = await fetchData(); // Wait for the fetchData function to complete

        if (!adjustedRecords || adjustedRecords.length === 0) {
            console.warn("No valid data to process.");
            return;
        }

        let jsonData = adjustedRecords.map(record => record.fields); // Extract only the fields

        // Filter nodes to include only those whose parent ID is in the dataset
        const validIds = new Set(jsonData.map(d => d.ID));
        jsonData = jsonData.filter(d => !d["Reports to"] || validIds.has(d["Reports to"]));
        
        jsonData.forEach(node => {
            node.Level = parseInt(node.Level) || 0; // Convert to integer or default to 0 if invalid
        });

        // Create rootNode using d3.stratify
        const rootNode = d3.stratify()
            .id(d => d.ID)
            .parentId(d => d["Reports to"])(jsonData);

        // Keep original data
        originalData = JSON.parse(JSON.stringify(jsonData));

        
        // Step 1: Assign missing levels
        jsonData = assignLevelsBasedOnDepth(jsonData, rootNode);

        // Step 1: Create a copy of the Level column
        jsonData.forEach(node => {
            node.originalLevel = node.Level; // Copy the current Level to originalLevel
        });

        // Step 2: Adjust levels to a maximum of 10
        jsonData = adjustLevels(jsonData);

        // Sort the dataset based on the Position field, alphabetically
        //jsonData.sort((a, b) => {
        //    return a.Position.localeCompare(b.Position); // Sort by Position if they report to the same person
        //});
        jsonData.sort((a, b) => {
            // Convert originalLevel to numbers for comparison
            const levelComparison = parseInt(a.originalLevel, 10) - parseInt(b.originalLevel, 10);
            if (levelComparison !== 0) {
                return levelComparison; // First criterion: originalLevel
            }
        
            // Second criterion: Position
            return a.Position.localeCompare(b.Position);
        });

        // Step 3: Add wrapper nodes if needed
        jsonData = addWrapperNodes(jsonData, maxNodesPerRow);

        // Step 4: Add invisible nodes where necessary
        const processedData = createInvisibleNodes(jsonData);

        allData = processedData;
        buildOrgChart(processedData);
    } catch (error) {
        console.error("Error loading data:", error);
    }
    document.getElementById("loading-container").style.display = "none";
    document.getElementById("controls-container").style.display = "flex";
    toggleOrgchartButtons()
}

function search(query) {
    const searchResultsContainer = document.getElementById('search-results');
    searchResultsContainer.innerHTML = ''; // Clear previous results

    if (query === '') {
        searchResultsContainer.style.display = 'none';
        return;
    }

    const results = allData.filter(d =>
        (d["Current name"] && d["Current name"].toLowerCase().includes(query.toLowerCase())) ||
        (d["Current badge number"] && d["Current badge number"].toString().includes(query))
    );

    results.forEach(result => {
        const resultElement = document.createElement('div');
        resultElement.textContent = `${result["Current name"]} (Badge: ${result["Current badge number"]})`;
        resultElement.style.padding = '5px';
        resultElement.style.cursor = 'pointer';
        resultElement.addEventListener('click', () => {
            highlightNode(result.ID);
            searchResultsContainer.style.display = 'none'; // Hide results after selection
        });
        searchResultsContainer.appendChild(resultElement);
    });

    searchResultsContainer.style.display = results.length ? 'block' : 'none';
}

// Function to highlight and expand path to the specific node
function highlightNode(targetId) {
    // Find the path from the root to the target node
    const path = [];
    let targetNode = allData.find(d => d.ID === targetId);
    
    while (targetNode) {
        path.unshift(targetNode);
        targetNode = allData.find(d => d.ID === targetNode["Reports to"]);
    }

    // Expand each node along the path and handle placeholders
    let currentNode = rootNode;
    for (let nodeData of path) {
        let node = currentNode.descendants().find(d => d.data.ID === nodeData.ID);
        if (node.data.ID === targetId){
            finalNode = node;
        }
        else if(node && node._children) {
            node.children = node._children;
            node._children = null;
            expandInvisibleNodes(node);
        }
        currentNode = node;
    }

    updateChart(rootNode); // Update chart to reflect the expanded nodes
    recenterSVG(finalNode);
}

document.getElementById('search-box').addEventListener('input', function() {
    search(this.value.trim());
});

// Expand all nodes
function expandAll() {
    function expand(node) {
        if (node._children) {
            node.children = node._children;
            node._children = null;
        }
        if (node.children) {
            node.children.forEach(expand);
        }
    }
    expand(rootNode);  // Start from the root node
    updateChart(rootNode);  // Redraw the chart with all nodes expanded
    recenterSVG(rootNode);
}

// Collapse all nodes
function collapseAll() {
    restoreOriginalView()
    function collapse(node) {
        if (node.children) {
            node._children = node.children; // Move children to _children to collapse
            node.children = null;
        }
        if (node._children) {
            node._children.forEach(collapse); // Recursively collapse all children
        }
    }
    collapse(rootNode);  // Start collapsing from the root node
    updateChart(rootNode);  // Redraw the chart with all nodes collapsed except the root
    recenterSVG(rootNode);
}

// Function to collapse all levels below a node
function collapseAllBelow(node) {
    function collapseAllRecursive(n) {
        if (n.children) {
            n._children = n.children;
            n._children.forEach(collapseAllRecursive); // Recursively collapse
            n.children = null;
        }
    }
    collapseAllRecursive(node);
    updateChart(rootNode);
    recenterSVG(node);
}

// Function to expand one level below a node
function expandOneLevel(node) {
    if (node._children) {
        node.children = node._children;
        node._children = null;
        expandInvisibleNodes(node); // Ensure invisible nodes expand automatically
    }
    updateChart(rootNode);
    recenterSVG(node);
}

// Function to expand all levels below a node
function expandAllBelow(node) {
    function expandAllRecursive(n) {
        if (n._children) {
            n.children = n._children;
            n._children = null;
        }
        if (n.children) {
            n.children.forEach(expandAllRecursive);
        }
    }
    expandAllRecursive(node);
    expandInvisibleNodes(node); // Ensure invisible nodes expand automatically
    updateChart(rootNode);
    recenterSVG(node);
}

// A helper function to get all descendants, including collapsed nodes
function getAllDescendants(node) {
    const descendants = [];
    (function traverse(n) {
        descendants.push(n); // Add the current node
        if (n.children) {
            n.children.forEach(traverse); // Recursively add visible children
        }
        if (n._children) {
            n._children.forEach(traverse); // Recursively add collapsed children
        }
    })(node);
    return descendants;
}

// Helper function to recursively expand all invisible nodes
function expandInvisibleNodes(node) {
    if (node._children && (node.data.Position === "Placeholder" || node.data.Level === maxLevel)) {
        node.children = node._children; // Expand the invisible node
        node._children = null;
    }

    if (node.children) {
        node.children.forEach(child => expandInvisibleNodes(child));
    }
}

// Returns the total number of descendants (at any depth)
// that are neither placeholders nor wrappers.
function getAllRealDescendantsCount(d) {
    let count = 1;

    // DFS to gather both expanded and collapsed children
    function gather(node) {
        // If node has expanded children
        if (node.children) {
            node.children.forEach(child => {
                if (child.data.Position !== "Placeholder" && child.data.Position !== "Wrapper") {
                    count++;
                }
                gather(child); // Recurse deeper
            });
        }
        // If node has collapsed children
        if (node._children) {
            node._children.forEach(child => {
                if (child.data.Position !== "Placeholder" && child.data.Position !== "Wrapper") {
                    count++;
                }
                gather(child); // Recurse deeper
            });
        }
    }

    gather(d);
    return count;
}

function recenterSVG(CenterPoint) {
    if (!CenterPoint) {
        CenterPoint = rootNode;
    }

    const visibleNodes = CenterPoint.descendants().filter(d => d.depth === 0 || d.parent);

    const minX = d3.min(visibleNodes, d => d.x);
    const maxX = d3.max(visibleNodes, d => d.x);
    const minY = d3.min(visibleNodes, d => d.y);
    const maxY = d3.max(visibleNodes, d => d.y);

    const nodesWidth = maxX - minX;
    const nodesHeight = maxY - minY;

    const containerWidth = document.querySelector('#SVG-container').clientWidth;
    const containerHeight = document.querySelector('#SVG-container').clientHeight;

    const paddingFactor = 1.1;
    const minWidth = 5 * rectWidth; 
    const minHeight = 5 * rectHeight;

    const scale = Math.min(
        containerWidth / Math.max(nodesWidth + margin.left + margin.right, minWidth) / paddingFactor,
        containerHeight / Math.max(nodesHeight + margin.top + margin.bottom, minHeight) / paddingFactor
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const transform = d3.zoomIdentity
        .translate(containerWidth / 2 - scale * centerX, containerHeight / 2 - scale * centerY)
        .scale(scale);

    d3.select('svg')
        .transition()
        .duration(1200)
        .call(zoom.transform, transform);
}

function updateCategorySummary(data) {
    const isFilteringAmbatovy = isFilterEmployeeActive; // Check filter status
    //console.log(isFilteringAmbatovy)

    const ambatovyCategories = [
        { name: "National Employee", color: "#007B4C" },
        { name: "Expatriate Employee", color: "#23C587" },
        { name: "PN External", color: "#DD3D3F" },
        { name: "Trainee / Intern", color: "#FA9735" }
    ];

    const externalsCategories = [
        { name: "National External", color: "#93a0f0" },
        { name: "Expatriate External", color: "#1F2E90" },
        { name: "TCN External", color: "#F38485" }
    ];

    const ambatovyBody = document.querySelector("#ambatovy-body");
    const externalsBody = document.querySelector("#externals-body");
    const totalBody = document.querySelector("#total-body");

    ambatovyBody.innerHTML = "";
    externalsBody.innerHTML = ""; 
    totalBody.innerHTML = ""; 

    let totalFilledAmbatovy = 0;
    let totalVacantAmbatovy = 0;
    let grandTotalAmbatovy = 0;

    ambatovyCategories.forEach(({ name, color }) => {
        const filled = data.filter(d => d.data["Current category"] === name && d.data.Status !== "Vacant").length;
        const vacant = data.filter(d => d.data["Current category"] === name && d.data.Status === "Vacant").length;
        const categoryTotal = filled + vacant;

        totalFilledAmbatovy += filled;
        totalVacantAmbatovy += vacant;
        grandTotalAmbatovy += categoryTotal;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><span class="category-circle" style="background-color: ${color};"></span> ${name}</td>
            <td>${filled.toLocaleString()}</td>
            <td>${vacant.toLocaleString()}</td>
            <td>${categoryTotal.toLocaleString()}</td>
        `;
        ambatovyBody.appendChild(row);
    });

    // Add Ambatovy Total Row
    const ambatovyTotalRow = document.createElement("tr");
    ambatovyTotalRow.className = "total-row";
    ambatovyTotalRow.innerHTML = `
        <td><strong>Ambatovy Total</strong></td>
        <td><strong>${totalFilledAmbatovy.toLocaleString()}</strong></td>
        <td><strong>${totalVacantAmbatovy.toLocaleString()}</strong></td>
        <td><strong>${grandTotalAmbatovy.toLocaleString()}</strong></td>
    `;
    ambatovyBody.appendChild(ambatovyTotalRow);

    // Now, process Externals
    let totalFilledExternals = 0;
    let totalVacantExternals = 0;
    let grandTotalExternals = 0;

    externalsCategories.forEach(({ name, color }) => {
        const filled = data.filter(d => d.data["Current category"] === name && d.data.Status !== "Vacant").length;
        const vacant = data.filter(d => d.data["Current category"] === name && d.data.Status === "Vacant").length;
        const categoryTotal = filled + vacant;

        totalFilledExternals += filled;
        totalVacantExternals += vacant;
        grandTotalExternals += categoryTotal;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><span class="category-circle" style="background-color: ${color};"></span> ${name}</td>
            <td>${filled.toLocaleString()}</td>
            <td>${vacant.toLocaleString()}</td>
            <td>${categoryTotal.toLocaleString()}</td>
        `;
        externalsBody.appendChild(row);
    });

    // Add Externals Total Row
    const externalsTotalRow = document.createElement("tr");
    externalsTotalRow.className = "total-row";
    externalsTotalRow.innerHTML = `
        <td><strong>Externals Total</strong></td>
        <td><strong>${totalFilledExternals.toLocaleString()}</strong></td>
        <td><strong>${totalVacantExternals.toLocaleString()}</strong></td>
        <td><strong>${grandTotalExternals.toLocaleString()}</strong></td>
    `;
    externalsBody.appendChild(externalsTotalRow);

    // If not filtering, add Grand Total, otherwise don't add another Ambatovy Total
    if (!isFilteringAmbatovy) {
        const grandTotalRow = document.createElement("tr");
        grandTotalRow.className = "grand-total-row";
        grandTotalRow.innerHTML = `
            <td><strong>Grand Total</strong></td>
            <td><strong>${(totalFilledAmbatovy + totalFilledExternals).toLocaleString()}</strong></td>
            <td><strong>${(totalVacantAmbatovy + totalVacantExternals).toLocaleString()}</strong></td>
            <td><strong>${(grandTotalAmbatovy + grandTotalExternals).toLocaleString()}</strong></td>
        `;
        totalBody.appendChild(grandTotalRow);
    }


    // Hide externals if the filter is active
    document.getElementById("externals-body").style.display = isFilteringAmbatovy ? "none" : "table-row-group";

    // Show the table
    document.getElementById("category-summary").style.display = "block";
    document.getElementById("category-legend").style.display = "none";
}

function focusOnNode(node, flag = "false") {

    const header = document.getElementById("orgchart-header");
    const categorySummary = document.getElementById("category-summary");

    // Check if we're toggling off the focus for the same node
    if (focusedNode && focusedNode.data.ID === node.data.ID && flag === "true") {
        restoreOriginalView(); // If already focused, restore the view
        header.style.display = "none";
        categorySummary.style.display = "none";
        document.getElementById("category-legend").style.display = "flex";
        return;
    }

    // Set the focused node globally
    focusedNode = node;

    // Show the header and populate its content
    header.style.display = "grid"; // Ensure the flex display is applied
    // Dynamically update the header content
    document.querySelector(".header-cost-center").textContent = node.data["Cost center"] || "N/A";
    document.querySelector(".header-position").textContent = (node.data.Position || "N/A").toUpperCase();
    document.querySelector(".header-current-name").textContent = node.data["Current name"] || "Vacant";
    // Format the current date as DD/MM/YYYY
    const currentDate = new Date().toLocaleDateString("en-GB");
    document.querySelector(".header-edition-date").textContent = `Date: ${currentDate}`;

    // Filter nodes to show only the focused node and its descendants
    const focusedNodes = new Set(node.descendants().map(n => n.data.ID));

    // Count of Vacant positions
    //const RealNodes = getAllDescendants(node).filter(n => n.data.Position !== 'Placeholder' && n.data.Position !== 'Wrapper');
    //const vacantCount = RealNodes.filter(n => n.data.Status === 'Vacant').length;
    //document.querySelector(".header-vacant-positions").textContent = `Vacant positions: ${vacantCount}`;

    // Total positions (excluding Placeholders and Wrappers)
    //const totalPositions = RealNodes.length;
    //document.querySelector(".header-total-positions").textContent = `Total positions: ${totalPositions}`;

    const RealNodes = getAllDescendants(node).filter(n => n.data.Position !== 'Placeholder' && n.data.Position !== 'Wrapper');
    updateCategorySummary(RealNodes);

    // Update the visibility of nodes
    g.selectAll('.node')
        .style('opacity', d => focusedNodes.has(d.data.ID) ? 1 : 0.0);

    // Update the visibility of links
    g.selectAll('.link')
        .style('opacity', d => 
            focusedNodes.has(d.data.ID) && 
            focusedNodes.has(d.parent.data.ID) ? 1 : 0.0
        );
}

// Function to restore the original view
function restoreOriginalView() {
    // Reset the focused node
    focusedNode = null;

    // Restore the visibility of all nodes
    g.selectAll('.node').style('opacity', 1);

    // Restore the visibility of all links
    g.selectAll('.link').style('opacity', 1);

    // Reset the focus button to the original icon
    g.selectAll('.focus-icon-group')
        .select('image')
        .attr('xlink:href', 'eye.png'); // Set back to the original "eye" icon

    // Hide the header text
    const header = document.getElementById("orgchart-header");
    header.style.display = "none";
    document.getElementById("category-summary").style.display = "none";
    document.getElementById("category-legend").style.display = "flex";
}

document.getElementById("more-granular").addEventListener("click", () => {
    restoreOriginalView();
    if (maxLevel < 20) { // Define an upper limit if necessary
        maxLevel++;
        updateOrgChartWithNewLevel();
    }
});

document.getElementById("less-granular").addEventListener("click", () => {
    if (maxLevel > 6) { // Define a lower limit if necessary
        maxLevel--;
        updateOrgChartWithNewLevel();
    }
});

function updateOrgChartWithNewLevel() {
    if (!allData || allData.length === 0) {
        console.warn("No org chart data available to update.");
        return;
    }

    // Update levels while keeping the same dataset
    let adjustedData = adjustLevels(allData);
    adjustedData = addWrapperNodes(adjustedData, maxNodesPerRow);
    adjustedData = createInvisibleNodes(adjustedData);

    allData = adjustedData; // Update the reference to reflect the changes
    buildOrgChart(adjustedData); // Rebuild the org chart
}

function buildOrgChart(processedData) {
    // Remove any existing orgchart-svg element
    const existingSvg = d3.select('.orgchart-svg');
    if (!existingSvg.empty()) {
        existingSvg.remove();
    }

    // Now proceed with the org chart creation logic
    const svg = d3.select('#SVG-container')
        .insert('svg', ':first-child')
        .attr('class', 'orgchart-svg')
        .call(zoom) // Apply zoom behavior here
        .append('g');

    // Add the shadow filter to the SVG
    const defs = svg.append('defs');

    defs.append('filter')
        .attr('id', 'shadow')
        .attr('x', '-20%')
        .attr('y', '-20%')
        .attr('width', '140%')
        .attr('height', '140%')
        .append('feDropShadow')
        .attr('dx', 1) // Horizontal shadow offset
        .attr('dy', 1) // Vertical shadow offset
        .attr('stdDeviation', 2) // Blur radius
        .attr('flood-color', '#000') // Shadow color
        .attr('flood-opacity', 1); // Shadow transparency

    g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create the hierarchical structure including wrapper nodes
    rootNode = d3.stratify()
        .id(d => d.ID)
        .parentId(d => d["Reports to"])(processedData);

    collapseAll();
    updateChart(rootNode);
    recenterSVG(rootNode);
}

function getActingCategoryClass(category) {
    switch (category) {
        case "TCN External": return "tcn-external";
        case "Expatriate Employee": return "expatriate-employee";
        case "National Employee": return "national-employee";
        case "PN External": return "pn-external";
        case "Expatriate External": return "expatriate-external";
        case "National External": return "national-external";
        case "Trainee / Intern": return "trainee-intern";
        default: return "default";
    }
}

function updateChart(source) {
    g.selectAll("*").remove();

    const rowSpacing = rectHeight * 1.1; // Vertical spacing between rows

    const treeLayout = d3.tree()
    .nodeSize([rectWidth * 1.18, rectHeight * 1.6])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.1));

    treeLayout(source);

    // Adjust node positions
    source.descendants().forEach(d => {
        // Check if the node is a wrapper node
        if(d.parent){
            if (d.parent.data.Position === "Wrapper") {
                // Set the y position to match its parent
                d.y = d.parent.y;
            }
            else if (d.data.Position === "Wrapper") {
                // Set the y position to match its parent
                d.y = d.parent.y + rowSpacing;
            }
        }
    });

    // Draw links
    const links = g.selectAll('.link')
        .data(source.descendants().slice(1).filter(d => 
            d.data.Position !== "Wrapper" && 
            d.parent.data.Position !== "Wrapper" // Exclude links connected to wrappers
        ))
        .enter().append('path')
        .attr('class', 'link')
        .attr('fill', 'none')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 2)
        .attr('d', d => {
            // Use the adjusted positions of nodes
            const midY = (d.y + d.parent.y) / 2;
            return `
                M${d.x},${d.y}
                V${midY}
                H${d.parent.x}
                V${d.parent.y}
            `;
        });

    // Draw nodes
    const nodes = g.selectAll('.node')
        .data(source.descendants())
        .enter().append('g')
        .attr('class', d => ((d.data.Position === "Placeholder") || (d.data.Position === "Wrapper")) ? 'node invisible' : 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);

    // For each node, if it has real children, add the indicator group
    nodes.each(function(d) {
        const node = d3.select(this);

        // Exclude Wrappers/Placeholders
        if (d.data.Position === "Placeholder" || d.data.Position === "Wrapper") return;

        // Count how many real children this node has
        const realChildCount = getAllRealDescendantsCount(d);
        if (realChildCount > 1 && d.data.Level < maxLevel) {
            // Create a container group for the child-count
            const childCountGroup = node.append("g")
                .attr("class", "child-count-group")
                // Position: below-left the node
                .attr("transform", `translate(${-rectWidth/2 + 15}, ${rectHeight/2 + 4})`);

            // Draw the background shape (geometry in JS)
            childCountGroup.append("rect")
                .attr("class", "child-count-rect")
                .attr("width", 42)
                .attr("height", 14)
                .attr("rx", 2)  // Make it a circle/oval
                .attr("x", 0)
                .attr("y", 0);

            // Draw the text (geometry in JS, style in CSS)
            childCountGroup.append("text")
                .attr("class", "child-count-text")
                .attr("x", 21)  // horizontally center in 24px
                .attr("y", 8)  // vertically center in 24px
                .attr("text-anchor", "middle")         // anchor horizontally
                .attr("dominant-baseline", "middle")   // anchor vertically
                .text(realChildCount.toLocaleString());
        }
    });

    // 
    nodes.on("click", function(event, d) {
        if (d.parent) {
            console.log(`Parent ID: ${d.parent.data.ID}`);
            console.log(`Node ID: ${d.data.ID}`);
            console.log(`Level: ${d.data.Level}`);
            console.log(`Depth: ${d.depth}`);
            console.log(`Position: ${d.data.Position}`);
            console.log(`Position ID: ${d.data["Position ID"]}`);
            console.log(`Original Level: ${d.data["originalLevel"]}`);
        } else {
            console.log("This node has no parent.");
            console.log(`Position ID: ${d.data["Position ID"]}`);
        }
    });

    // Draw vertical strip for category on the left side of the node
    nodes.filter(d => d.data.Position !== "Placeholder" && d.data.Position !== "Wrapper")
        .append('rect')
        .attr('x', -rectWidth / 2 - 15) // Align with the left edge of the card
        .attr('y', -rectHeight / 2) // Start at the top of the card
        .attr('width', rectWidth + 30) // Width of the vertical strip
        .attr('height', rectHeight) // Full height of the card
        .attr('rx', 25) // Rounded corners
        .attr('class', d => {
            switch (d.data["Current category"]) {
                case "TCN External": return 'category-strip tcn-external';
                case "Expatriate Employee": return 'category-strip expatriate-employee';
                case "National Employee": return 'category-strip national-employee';
                case "PN External": return 'category-strip pn-external';
                case "Expatriate External": return 'category-strip expatriate-external';
                case "National External": return 'category-strip national-external';
                case "Trainee / Intern": return 'category-strip trainee-intern';
                default: return 'category-strip default';
            }
        });

    // Draw vertical strip for person category on the left side of the node
    nodes.filter(d => d.data.Position !== "Placeholder" && d.data.Position !== "Wrapper" && d.data["Person category"])
        .append('path')
        .attr('d', d => {
            const x = -rectWidth / 2 - 15; // Left edge of the card
            const y = -rectHeight / 2; // Top edge of the card
            const width = rectWidth + 30; // Full width of the strip
            const height = rectHeight / 2; // Half the height of the card
            const radius = 25; // Radius for rounded corners

            // Define path for strip with rounded corners only at the top
            return `
                M${x + radius},${y} 
                h${width - 2 * radius} 
                a${radius},${radius} 0 0 1 ${radius},${radius} 
                v${height - radius} 
                h${-(width)} 
                v${-(height - radius)} 
                a${radius},${radius} 0 0 1 ${radius},${-radius} 
                Z
            `;
        })
        .attr('class', d => {
            switch (d.data["Person category"]) {
                case "TCN External": return 'person-category-strip tcn-external';
                case "Expatriate Employee": return 'person-category-strip expatriate-employee';
                case "National Employee": return 'person-category-strip national-employee';
                case "PN External": return 'person-category-strip pn-external';
                case "Expatriate External": return 'person-category-strip expatriate-external';
                case "National External": return 'person-category-strip national-external';
                case "Trainee / Intern": return 'person-category-strip trainee-intern';
                default: return 'person-category-strip default';
            }
        });

    // Main rectangle with rounded corners on one side
    nodes.append('path')
        .attr('d', d => {
            const x = -rectWidth / 2 + 15; // Starting x position
            const y = -rectHeight / 2; // Starting y position
            const width = rectWidth;
            const height = rectHeight;
            const radius = 25; // Corner radius for rounded corners

            // Define path for rectangle with rounded corners on the right side
            return `
                M${x},${y} 
                h${width - radius} 
                a${radius},${radius} 0 0 1 ${radius},${radius} 
                v${height - 2 * radius} 
                a${radius},${radius} 0 0 1 ${-radius},${radius} 
                h${-(width - radius)} 
                v${-height} 
                Z
            `;
        })
        .attr('class', d => {
            if (d.data.Position === "Placeholder" || d.data.Position === "Wrapper") {
                return 'node-rect invisible'; // Invisible for Placeholder or Wrapper nodes
            }
            return d.data.Status === "Vacant" ? 'node-rect vacant' : 'node-rect default';
        });

    // Adjust image position to the left side of the card with an oval clip
    nodes.filter(d => d.data.Position !== "Placeholder" && d.data.Position !== "Wrapper")
    .each(function(d) {
        const node = d3.select(this);
        const clipId = `clip-${d.data["Current badge number"]}`;

        // Determine if we need to shift down
        const yOffset = d.data["Acting (badge and name)"] ? 13 : 0;

        // Add Acting Strip if Acting (badge and name) is not null
        if (d.data["Acting (badge and name)"]) {
            // Define a unique clipPath for cropping the bottom half of the acting strip
            const clipId = `clip-acting-${d.data["Current badge number"]}`;
            node.append("clipPath")
                .attr("id", clipId)
                .append("rect")
                .attr("x", -rectWidth / 2 - 15) // Align with lateral strip
                .attr("y", -rectHeight / 2) // Same position as the acting strip
                .attr("width", rectWidth + 30) // Same width as the card
                .attr("height", rectHeight / 8 + 8); // Clip only the top half

            // Now apply the acting strip but **clip it** so that only the top half is visible
            node.append("rect")
                .attr("class", `acting-strip ${getActingCategoryClass(d.data["Acting person category"])}`)
                .attr("x", -rectWidth / 2 - 15) // Align with lateral strip
                .attr("y", -rectHeight / 2) // Position on top of the node
                .attr("width", rectWidth + 30) // Same width as the card
                .attr("height", rectHeight / 2) // Originally full half height
                .attr("rx", 25) // Rounded corners
                .attr("clip-path", `url(#${clipId})`); // Apply the clipping

                // Add Acting Text inside the strip
            node.append("text")
                .attr("class", "acting-text")
                .attr("x", 5) // Center horizontally
                .attr("y", -rectHeight / 2 + 11) // Adjust for visual centering
                .attr("text-anchor", "middle") // Center text horizontally
                .text(`Acting: ${d.data["Acting (badge and name)"].substring(0, 50)}`);
        };

        // Add an ellipse behind the clipped image for the shadow
        node.append("ellipse")
            .attr('cx', -rectWidth / 2 + 40) // Same center as the clip
            .attr('cy', 0) // Move down if necessary
            .attr('rx', 46) // Same horizontal radius as the clip
            .attr('ry', 50) // Same vertical radius as the clip
            .attr('class', 'image-shadow') // Assign class for shadow styling

        // Define a clipPath with an oval shape
        node.append("clipPath")
            .attr("id", clipId)
            .append("ellipse")
            .attr('cx', -rectWidth / 2 + 40) // Horizontal center of the oval
            .attr('cy', 0) // Vertical center of the oval
            .attr('rx', 46) // Horizontal radius of the oval
            .attr('ry', 50); // Vertical radius of the oval

        // Add the image, clipped to the oval shape
        // Fetch employee data from the API based on the badge number
        const badgeId = d.data["Current badge number"];
        if (badgeId) {
            // Construct the API URL with the badge ID
            const apiUrl = `https://inventory.ambatovy.mg/PeopleNetApi-0.0.1-SNAPSHOT/api/v1/employees/bagdeid/${badgeId}`;

            // Fetch employee data from the API
            fetch(apiUrl)
            .then(response => {
                if (response.ok) {
                    return response.json();  // Parse the JSON response
                } else {
                    console.error('Error fetching data:', response.status, response.statusText);
                    throw new Error('Image not found');
                }
            })
            .then(data => {
                const base64Image = data.photo || ''; // Fallback to empty string if photo is missing
                const imageUrl = base64Image ? `data:image/jpeg;base64,${base64Image}` : 'Anonymous.png';
            
                node.append("image")
                    .attr('xlink:href', imageUrl)
                    .attr('x', -rectWidth / 2 - 10)
                    .attr('y', -60)
                    .attr('width', 100)
                    .attr('height', 120)
                    .attr('clip-path', `url(#${clipId})`);
            })
            .catch(error => {
                console.error('Error fetching image:', error);
                node.append("image")
                    .attr('xlink:href', 'Anonymous.png')
                    .attr('x', -rectWidth / 2 - 10)
                    .attr('y', -60)
                    .attr('width', 100)
                    .attr('height', 120)
                    .attr('clip-path', `url(#${clipId})`);
            });
    
        } else {
            // Fallback if no badge ID is available
            node.append("image")
                .attr('xlink:href', 'Anonymous.png')
                .attr('x', -rectWidth / 2 - 10)
                .attr('y', -60)
                .attr('width', 100)
                .attr('height', 120)
                .attr('clip-path', `url(#${clipId})`);
        }
    
        // Add container for position, name, and badge number
        node.append("foreignObject")
            .attr("x", -20) // Align the container to the right section
            .attr("y", -rectHeight / 2 + 15 + yOffset) // Apply the Y offset
            .attr("width", rectWidth / 2 + 30) // Set width for text wrapping
            .attr("height", rectHeight - 20 - yOffset) // Allow space for all three elements
            .attr("class", "node-info-container")
            .append("xhtml:div")
            .attr("class", "node-info-wrapper")
            .html(d => `
                <div class="node-position-text ${d.data.Status === 'Vacant' ? 'vacant' : ''}">
                    ${d.data.Position.toUpperCase() || "N/A"}
                </div>
                <div class="node-name-badge-wrapper">
                    <div class="node-name-text" title="${d.data["Current name"] || ""}">
                        ${d.data["Current name"] ? d.data["Current name"].substring(0, 35) + (d.data["Current name"].length > 30 ? "..." : "") : ""}
                    </div>
                    <div class="node-badge-text">
                        ${d.data["Current badge number"] && d.data["CC code"] 
                            ? `${d.data["Current badge number"]} - ${d.data["CC code"]}` 
                            : ""}
                    </div>
                </div>
            `);

        // Draw border of the cards
        nodes.filter(d => d.data.Position !== "Placeholder" && d.data.Position !== "Wrapper")
            .append('rect')
            .attr('x', -rectWidth / 2 - 15) // Align with the left edge of the card
            .attr('y', -rectHeight / 2) // Start at the top of the card
            .attr('width', rectWidth + 30) // Width of the vertical strip
            .attr('height', rectHeight) // Full height of the card
            .attr('rx', 25) // Rounded corners
            .attr('class', 'node-rect-border');
    });

    // Adding expand/collapse and focus buttons at the bottom of each node
    nodes.filter(d => d.data.Position !== "Placeholder" && d.data.Position !== "Wrapper" && (d.children || d._children) && d.data.Level < maxLevel)
        .each(function(d) {
            const buttonGroup = d3.select(this)
                .append("g")
                .attr("class", "button-group");

            const buttonPositions = [
                { label: "colapse", action: () => collapseAllBelow(d) },
                { label: "single_expand", action: () => expandOneLevel(d) },
                { label: "expand_all", action: () => expandAllBelow(d) },
                { label: "focus", action: () => focusOnNode(d, "true") }
            ];

            buttonPositions.forEach((pos) => {
                if (pos.label == "single_expand") {
                    imageSrc = d.data.Status === "Vacant" ? 'arrow_down_inverted.png' : 'arrow_down.png';
                    // Add single expand button icon
                    buttonGroup.append("svg:image")
                        .attr("xlink:href", imageSrc)
                        .attr("x", rectWidth/2 - 60)
                        .attr("y", rectHeight/2 - 22)
                        .attr("width", 30)
                        .attr("height", 30)
                        .on("click", function(event) {
                            event.stopPropagation();
                            pos.action();
                        });

                } else if (pos.label == "expand_all") {
                    imageSrc = d.data.Status === "Vacant" ? 'double_arrow_down_inverted.png' : 'double_arrow_down.png';
                    // Add expand all button icon
                    buttonGroup.append("svg:image")
                        .attr("xlink:href", imageSrc)
                        .attr("x", rectWidth/2 - 15)
                        .attr("y", rectHeight/2 - 15)
                        .attr("width", 15)
                        .attr("height", 15)
                        .on("click", function(event) {
                            event.stopPropagation();
                            pos.action();
                        });

                } else if (pos.label == "colapse") {
                    imageSrc = d.data.Status === "Vacant" ? 'arrow_up_inverted.png' : 'arrow_up.png';
                    // Add expand all button icon
                    buttonGroup.append("svg:image")
                        .attr("xlink:href", imageSrc)
                        .attr("x", rectWidth/2 - 33)
                        .attr("y", rectHeight/2 - 12)
                        .attr("width", 10)
                        .attr("height", 10)
                        .on("click", function(event) {
                            event.stopPropagation();
                            pos.action();
                        });
                        
                } else if (pos.label == "focus") {
                    imageSrc = d.data.Status === "Vacant" ? 'eye_inverted.png' : 'eye.png';
                    // Add focus button icon
                    buttonGroup.append("svg:image")
                        .attr("xlink:href", imageSrc)
                        .attr("x", rectWidth/2 - 74)
                        .attr("y", rectHeight/2 - 14)
                        .attr("width", 14)
                        .attr("height", 14)
                        .attr("class", "focus-button-icon")
                        .on("click", function(event) {
                            event.stopPropagation();
                            pos.action();
                        });
                }
            });
        });

    if (focusedNode) focusOnNode(focusedNode);

    setupNodeRightClickHandler();

    // Add context menu handling for nodes
    nodes.on('contextmenu', function(event, d) {
        event.preventDefault();
        event.stopPropagation();

        // Ignore Placeholder or Wrapper nodes
        if (d.data.Position === 'Placeholder' || d.data.Position === 'Wrapper') return;

        // Dynamically add the context menu for this node
        addContextMenu(d);

        // Show the custom context menu
        d3.select('#context-menu')
            .style('display', 'block')
            .style('left', `${event.pageX}px`)
            .style('top', `${event.pageY}px`);
    });

    // Hide the context menu when clicking elsewhere
    d3.select('body').on('click.context-menu', () => {
        d3.select('#context-menu').style('display', 'none');
    });
}