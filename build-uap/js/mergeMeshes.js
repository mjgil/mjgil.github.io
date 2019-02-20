var mergeMeshes = function (meshName, arrayObj, scene) {
    var arrayPos = [];
    var arrayNormal = [];
    var arrayUv = [];
    var arrayUv2 = [];
    var arrayColor = [];
    var arrayMatricesIndices = [];
    var arrayMatricesWeights = [];
    var arrayIndice = [];
    var savedPosition = [];
    var savedNormal = [];
    var newMesh = new BABYLON.Mesh(meshName, scene);
    var UVKind = true;
    var UV2Kind = true;
    var ColorKind = true;
    var MatricesIndicesKind = true;
    var MatricesWeightsKind = true;

    for (i = 0; i != arrayObj.length ; i++) {
        if (!arrayObj[i].isVerticesDataPresent([BABYLON.VertexBuffer.UVKind]))
            UVKind = false;
        if (!arrayObj[i].isVerticesDataPresent([BABYLON.VertexBuffer.UV2Kind]))
            UV2Kind = false;
        if (!arrayObj[i].isVerticesDataPresent([BABYLON.VertexBuffer.ColorKind]))
            ColorKind = false;
        if (!arrayObj[i].isVerticesDataPresent([BABYLON.VertexBuffer.MatricesIndicesKind]))
            MatricesIndicesKind = false;
        if (!arrayObj[i].isVerticesDataPresent([BABYLON.VertexBuffer.MatricesWeightsKind]))
            MatricesWeightsKind = false;
    }

    for (i = 0; i != arrayObj.length ; i++) {
        var ite = 0;
        var iter = 0;
        arrayPos[i] = arrayObj[i].getVerticesData(BABYLON.VertexBuffer.PositionKind);
        arrayNormal[i] = arrayObj[i].getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (UVKind)
            arrayUv = arrayUv.concat(arrayObj[i].getVerticesData(BABYLON.VertexBuffer.UVKind));
        if (UV2Kind)
            arrayUv2 = arrayUv2.concat(arrayObj[i].getVerticesData(BABYLON.VertexBuffer.UV2Kind));
        if (ColorKind)
            arrayColor = arrayColor.concat(arrayObj[i].getVerticesData(BABYLON.VertexBuffer.ColorKind));
        if (MatricesIndicesKind)
            arrayMatricesIndices = arrayMatricesIndices.concat(arrayObj[i].getVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind));
        if (MatricesWeightsKind)
            arrayMatricesWeights = arrayMatricesWeights.concat(arrayObj[i].getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind));

        var maxValue = savedPosition.length / 3;

        arrayObj[i].computeWorldMatrix(true);
        var worldMatrix = arrayObj[i].getWorldMatrix();

        while (ite < arrayPos[i].length) {
            var vertex = new BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(arrayPos[i][ite], arrayPos[i][ite + 1], arrayPos[i][ite + 2]), worldMatrix);
            savedPosition.push(vertex.x);
            savedPosition.push(vertex.y);
            savedPosition.push(vertex.z);
            ite = ite + 3;
        }
        while (iter < arrayNormal[i].length) {
            var vertex = new BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(arrayNormal[i][iter], arrayNormal[i][iter + 1], arrayNormal[i][iter + 2]), worldMatrix);
            savedNormal.push(vertex.x);
            savedNormal.push(vertex.y);
            savedNormal.push(vertex.z);
            iter = iter + 3;
        }
        if (i > 0) {
            var tmp = arrayObj[i].getIndices();
            for (it = 0 ; it != tmp.length; it++) {
                tmp[it] = tmp[it] + maxValue;
            }
            arrayIndice = arrayIndice.concat(tmp);
        }
        else {
            arrayIndice = arrayObj[i].getIndices();
        }

        arrayObj[i].dispose(false);
    }

    newMesh.setVerticesData(savedPosition, BABYLON.VertexBuffer.PositionKind, false);
    newMesh.setVerticesData(savedNormal, BABYLON.VertexBuffer.NormalKind, false);
    if (arrayUv.length > 0)
        newMesh.setVerticesData(arrayUv, BABYLON.VertexBuffer.UVKind, false);
    if (arrayUv2.length > 0)
        newMesh.setVerticesData(arrayUv, BABYLON.VertexBuffer.UV2Kind, false);
    if (arrayColor.length > 0)
        newMesh.setVerticesData(arrayUv, BABYLON.VertexBuffer.ColorKind, false);
    if (arrayMatricesIndices.length > 0)
        newMesh.setVerticesData(arrayUv, BABYLON.VertexBuffer.MatricesIndicesKind, false);
    if (arrayMatricesWeights.length > 0)
        newMesh.setVerticesData(arrayUv, BABYLON.VertexBuffer.MatricesWeightsKind, false);

    newMesh.setIndices(arrayIndice);
    return newMesh;
};

