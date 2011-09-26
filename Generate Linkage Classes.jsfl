var currentDocument = fl.getDocumentDOM();
var _generatedItems = [];
var _filesToGenerate = [];
var _frameLabels = [];
var codeGenFolderUri = fl.browseForFolderURL("Select a folder to generate your ActionScript 3 files.");
var layerIndex;
var objectsLayer;


if (currentDocument)
{
	currentTimeline = currentDocument.getTimeline();
	layerIndex = currentTimeline.addNewLayer("ObjectCreation", "normal", true);
	currentTimeline.currentFrame = 1;
	objectsLayer = currentTimeline.layers[layerIndex];
	
	_createLinkedObjectInstances();
	_inspectLayers([objectsLayer]);
	currentTimeline.deleteLayer(layerIndex);
}
else
{
	alert("There are currently no documents open.");	
}

function _createLinkedObjectInstances()
{
	var library = currentDocument.library;
	var items = library.items;
	var totalItems = items.length;
	var item;
	for (var n = 0; n < totalItems; n++)
	{
		item = items[n];
		
		if (item.linkageExportForAS)
		{
			currentDocument.addItem({x:0,y:0}, item);	
		}		
	}
}

function _inspectLayers(layers)
{
	for (var i = 0; i < layers.length; i++)
	{	
		var layer = layers[i];
		
		if (layer.layerType == "normal")
		{
			_inspectFrames(layer.frames);
		}
	}
}

function _inspectFrames(frames)
{
	for (j = 0; j < frames.length; j++)
	{
		frame = frames[j];
		
		_checkForFrameLabel(frame);
		
		frameElements = frame.elements;
		
		_inspectElements(frameElements);
	}	
}

function _checkForFrameLabel(aFrame)
{
	if (aFrame.labelType == "name")
	{
		if (_frameLabels.lastIndexOf(aFrame.name) == -1)
			_frameLabels.push(aFrame.name);
	}
}

function _inspectElements(insepectElements)
{
	for (k = 0; k < insepectElements.length; k++)
	{
		anElement = insepectElements[k];
						
		if (anElement && anElement.elementType == "instance")
		{
			_generateInstanceClasses(anElement);
		}
	}
}

function _generateSourceFiles()
{
	if (_filesToGenerate.length > 0)
	{
		for (f = 0; f < _filesToGenerate.length; f++)
		{
			fileObj = _filesToGenerate[f];
			newFilePath = codeGenFolderUri + "/" + fileObj.filePackagePath + "/" + fileObj.fName;
			FLfile.write(newFilePath, fileObj.fileBody);
		}
		
		_filesToGenerate = [];
		_frameLabels = [];
	}
}


function _generateInstanceClasses(instanceElement)
{
	libraryItem = instanceElement.libraryItem;
	if (undefined == _generatedItems[libraryItem.name])
	{
		
		classTemplate = "package [$package]\n{\n\timport flash.display.MovieClip;\n\timport flash.text.TextField;\n\t[$imports]\n\tpublic class [$className] extends MovieClip implements [$interfaceName]\n\t{\n\t\t[$classBody]\n\t}\n}\n";		
		interfaceTemplate = "package [$package]\n{\n\timport flash.display.MovieClip;\n\timport flash.events.IEventDispatcher;\n\timport flash.text.TextField;\n\t[$imports]\n\tpublic interface [$interfaceName] extends IEventDispatcher\n\t{\n[$interfaceBody]\t}\n}\n";
		
		// Setup Class and Interface 
		linkageClassName = libraryItem.linkageClassName;
		
		// Skip this element generation if there is no linkage class
		if (undefined == linkageClassName)
		{
			return;
		}
		
		linkageBaseClass = libraryItem.linkageBaseClass; // Empty string means default 'flash.display.MovieClip'
		lastPackageDot = linkageClassName.lastIndexOf(".");
		classPackage = linkageClassName.substr(0, lastPackageDot);
		className = linkageClassName.substr(lastPackageDot + 1, linkageClassName.length - (lastPackageDot + 1));
		interfaceName = "I" + className;
		
		// Make Class and Interface Body
		addedImports = [];
		addedTextFields = [];
		addedSetterGetter = [];
		imports = "";
		classBody = "";
		interfaceBody = "";
		
		
		if (libraryItem.linkageExportForAS)
		{
			classMembers = _getClassMembers(libraryItem);
						
			// Make TextField getter/setters
			for (l = 0; l < classMembers.textFields.length; l++)
			{
				textField = classMembers.textFields[l];
				
				var textFieldName = textField.name.replace(/^\s+|\s+$/g, '');
				if (null != textField.name && textFieldName.length > 0 && !addedTextFields[textFieldName])
				{
					classBody = classBody + "\n\t\tprivate var _" +textFieldName+ ":TextField;\n"
					classBody = classBody + "\n\t\tpublic function get " +textFieldName+ "():TextField\n\t\t{\n\t\t\treturn _"+textFieldName+"\n\t\t}\n";
					classBody = classBody + "\n\t\tpublic function set " +textFieldName+ "(value:TextField):void\n\t\t{\n\t\t\t_"+textFieldName+" = value;\n\t\t}\n";

					interfaceBody = interfaceBody + "\t\tfunction get " +textFieldName+ "():TextField;\n\n";
					interfaceBody = interfaceBody + "\t\tfunction set " +textFieldName+ "(value:TextField):void;\n\n";
					
					addedTextFields[textFieldName] = true;
				}	
			}
			
			// Make MovieClip getter/setters
			for (m = 0; m < classMembers.movieClips.length; m++)
			{
				movieClip = classMembers.movieClips[m];
				
				variableName = movieClip.name;
				
				if (variableName && variableName.length > 0)
				{
					if (movieClip.libraryItem.linkageExportForAS)
					{
						variableType = movieClip.libraryItem.linkageClassName;
						
						// Add import, make sure it hasnt been added
						if (undefined == addedImports[variableType])
						{
							imports = imports + "import " + variableType + ";\n\t"
							addedImports[variableType] = true;
						}
						
						lastDot = variableType.lastIndexOf(".") + 1;
						shortName = variableType.substr(lastDot, variableType.length - lastDot);
					}
					else
					{
						variableType = "flash.display.MovieClip";
						shortName = "MovieClip";
					}
					
					if (undefined == addedSetterGetter[variableName])
					{
						classBody = classBody + "\n\t\tprivate var _" +variableName+ ":"+shortName+";\n"
						classBody = classBody + "\n\t\tpublic function get " +variableName+ "():"+shortName+"\n\t\t{\n\t\t\treturn _"+variableName+"\n\t\t}\n";
						classBody = classBody + "\n\t\tpublic function set " +variableName+ "(value:"+shortName+"):void\n\t\t{\n\t\t\t_"+variableName+" = value;\n\t\t}\n";

						interfaceBody = interfaceBody + "\t\tfunction get " +variableName+ "():"+shortName+";\n\n";
						interfaceBody = interfaceBody + "\t\tfunction set " +variableName+ "(value:"+shortName+"):void;\n\n";
						
						addedSetterGetter[variableName] = true;
					}
				}
			}
		}

		
		// Make frame label functions
		for (f = 0; f < _frameLabels.length; f++)
		{
			frameLabel = _frameLabels[f];
			
			classBody = classBody + "\n\t\tpublic function goToLabelAndStop_" +frameLabel+ "():void\n\t\t{\n\t\t\tgotoAndStop('"+frameLabel+"');\n\t\t}\n";
			classBody = classBody + "\n\t\tpublic function goToLabelAndPlay_" +frameLabel+ "():void\n\t\t{\n\t\t\tgotoAndPlay('"+frameLabel+"');\n\t\t}\n";
			
			interfaceBody = interfaceBody + "\t\tfunction goToLabelAndStop_" +frameLabel+ "():void;\n\n";
			interfaceBody = interfaceBody + "\t\tfunction goToLabelAndPlay_" +frameLabel+ "():void;\n\n";
		}
		
		// End making class and interface body
		
		
		
		// Write out class into template
		generatedClass = classTemplate.replace("[$package]", classPackage);
		generatedClass = generatedClass.replace("[$imports]", imports);
		generatedClass = generatedClass.replace("[$className]", className);
		generatedClass = generatedClass.replace("[$interfaceName]", interfaceName);
		generatedClass = generatedClass.replace("[$classBody]", classBody);
					
		// Get package path
		packagePath = classPackage;
		while (packagePath.lastIndexOf(".") > -1)
		{
			packagePath = packagePath.replace(".", "/");
		}
		
		fileName = className + ".as";
		file = {fName:fileName, filePackagePath:packagePath, fileBody:generatedClass};
		_filesToGenerate.push(file);
		
		generatedInterface = interfaceTemplate.replace("[$package]", classPackage);
		generatedInterface = generatedInterface.replace("[$imports]", imports);
		generatedInterface = generatedInterface.replace("[$interfaceName]", interfaceName);
		generatedInterface = generatedInterface.replace("[$interfaceBody]", interfaceBody);
		
		fileName = interfaceName + ".as";
		file = {fName:fileName, filePackagePath:packagePath, fileBody:generatedInterface};
		_filesToGenerate.push(file);
		
		_generateSourceFiles();
		
		//_generatedItems[libraryItem.name] = true;
	}
}

function _getClassMembers(symbolItem)
{
	symbolTimeline = symbolItem.timeline;
	textFieldElements = [];
	movieClipElements = [];
	
	for (n = 0; n < symbolTimeline.layers.length; n++)
	{
		symLayer = symbolTimeline.layers[n];
		
		// Check frames
		for (o = 0; o < symLayer.frames.length; o++)
		{
			symFrame = symLayer.frames[o];
			
			_checkForFrameLabel(symFrame);
			
			// Check elements
			for (p = 0; p < symFrame.elements.length; p++)
			{
				symElement = symFrame.elements[p];
				
				if ("[object Text]" == symElement.toString())
				{
					if (textFieldElements.lastIndexOf(symElement) == -1)
						textFieldElements.push(symElement);
				}
				
				if ("movie clip" == symElement.symbolType)
				{
					if (movieClipElements.lastIndexOf(symElement) == -1)
						movieClipElements.push(symElement);
				}
			}
		}
	}
	
	return {textFields:textFieldElements, movieClips:movieClipElements};
}



