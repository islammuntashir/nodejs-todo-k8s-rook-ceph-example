# nodejs-todo-k8s-example
This git is initated to cover a challenge

STEP 1
===========================================================================

This app is simple todo app. made through the concept of this articale
https://medium.com/@atingenkay/creating-a-todo-app-with-node-js-express-8fa51f39b16f

I have added another data saving and retriving layer upon it. Now by browsing localhost:4040/list you will get all the previous list generated by the user

  Run the app as "node index.js"
  
I have also integrate simple test case. To run that test case please run "npm test"

STEP 2
============================================================================

Now Creating docker file using following content

    FROM node:10-alpine
    RUN mkdir -p /app/node_modules
    WORKDIR /app
    COPY package*.json ./
    RUN npm config set registry http://registry.npmjs.org/
    RUN npm install
    COPY . .
    EXPOSE 4040
    CMD [ "node", "index.js" ]

STEP 3
============================================================================

Create Docker image using following command

  docker build -t muntashir/node-todo-app . 

push image to dockerhub. first login with username then push the image

  docker login -u muntashir
  docker push muntashir/node-todo-app
  
 STEP 4
 ==========================================================================
Create new chart anmed nodeappexample using Helm.As I am working on local cluster I need to install cloud native storage orchestrato. I am working with rook/ceph here.
I have configured storage class by following this URL

https://github.com/rook/rook/blob/master/Documentation/ceph-quickstart.md

The storage class looks like this

    NAME              PROVISIONER          AGE
    rook-ceph-block   ceph.rook.io/block   1d

Now Change value.yaml file. and update storage class, service , images etc 

    replicaCount: 3

    image:
      repository: muntashir/node-todo-app
      tag: latest
      pullPolicy: Always
    fullname: "a"
    nameOverride: ""
    fullnameOverride: ""

    service:
      type: NodePort
      port: 4040
      targetPort: 4040
      nodePort: 30100
  
    ingress:
      enabled: false
      annotations: {}
      # kubernetes.io/ingress.class: nginx
      # kubernetes.io/tls-acme: "true"
      paths: []
      hosts:
      - chart-example.local
      tls: []
    persistentVolume:
      enabled: true
      path: /app/data
      storageClass: "rook-ceph-block"
      accessModes:
      - ReadWriteOnce
      - ReadOnlyMany
      size: 10Gi
      annotations: {}
    resources: {}

    nodeSelector: {}

    tolerations: []

    affinity: {}

Here I have defined storageClass to rook-ceph-block as per my cloud-native orchestrator

Then Create Stateful Set 

    apiVersion: apps/v1 
    kind: StatefulSet
    metadata:
      name: {{ include "nodeappexample.fullname" . }}
      labels:
        app.kubernetes.io/name: {{ include "nodeappexample.name" . }}
        helm.sh/chart: {{ include "nodeappexample.chart" . }}
        app.kubernetes.io/instance: {{ .Release.Name }}
        app.kubernetes.io/managed-by: {{ .Release.Service }}
    
    spec:
      serviceName: "nginx"
      selector:
        matchLabels:
          app.kubernetes.io/name: {{ include "nodeappexample.name" . }}
          app.kubernetes.io/instance: {{ .Release.Name }}
      replicas: {{ .Values.replicaCount }}
      template:
        metadata:
          labels:
            app.kubernetes.io/name: {{ include "nodeappexample.name" . }}
            app.kubernetes.io/instance: {{ .Release.Name }}
      spec:
        containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
          - name: http
            containerPort: 4040
            protocol: TCP
          volumeMounts:
          - name: data
            mountPath: /app/data
        
          livenessProbe:
            httpGet:
              path: /
              port: http
          readinessProbe:
            httpGet:
              path: /
              port: http
    volumeClaimTemplates:
    - metadata:
      name: data
      spec:
        accessModes:
          - ReadWriteOnce
          - ReadOnlyMany
        resources:
          requests:
            storage: 1Gi
        storageClassName: rook-ceph-block

Now deploy the helm chart

    helm install --name nodetodoexample ./nodeappexample
    
You will see the following output 

    NAME:   nodetodoexample
    LAST DEPLOYED: Tue Oct 22 16:36:42 2019
    NAMESPACE: default
    STATUS: DEPLOYED

    RESOURCES:
    ==> v1/Service
    NAME                            TYPE      CLUSTER-IP     EXTERNAL-IP  PORT(S)         AGE
    nodetodoexample-nodeappexample  NodePort  10.105.219.41  <none>       4040:30204/TCP  0s

    ==> v1/StatefulSet
    NAME                            DESIRED  CURRENT  AGE
    nodetodoexample-nodeappexample  3        1        0s

    ==> v1/Pod(related)
    NAME                              READY  STATUS             RESTARTS  AGE
    nodetodoexample-nodeappexample-0  0/1    ContainerCreating  0         0s


Now the claimed PV are 

    NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                           STORAGECLASS      REASON   AGE
    pvc-d6d8c491-f4ba-11e9-a900-0ad43be7c3d2   1Gi        RWO            Delete           Bound    default/data-nodetodoexample-nodeappexample-0   rook-ceph-block            6h2m
    pvc-df882810-f4ba-11e9-a900-0ad43be7c3d2   1Gi        RWO            Delete           Bound    default/data-nodetodoexample-nodeappexample-1   rook-ceph-block            6h2m
    pvc-e5afd07f-f4ba-11e9-a900-0ad43be7c3d2   1Gi        RWO            Delete           Bound    default/data-nodetodoexample-nodeappexample-2   rook-ceph-block 


if we check all PVC 

    kubectl get pvc

you will find 

    NAME                                    STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS      AGE
    data-nodetodoexample-nodeappexample-0   Bound    pvc-d6d8c491-f4ba-11e9-a900-0ad43be7c3d2   1Gi        RWO            rook-ceph-block   6h22m
    data-nodetodoexample-nodeappexample-1   Bound    pvc-df882810-f4ba-11e9-a900-0ad43be7c3d2   1Gi        RWO            rook-ceph-block   6h22m
    data-nodetodoexample-nodeappexample-2   Bound    pvc-e5afd07f-f4ba-11e9-a900-0ad43be7c3d2   1Gi        RWO            rook-ceph-block   6h21m

STEP 5
===============================================================================
VolumeSnapshot

First snapshot class for snapshotting. For ceph storage I need to deploy csi-rbdplugin-snapclass by deploying following snapshotClass.yaml

    apiVersion: snapshot.storage.k8s.io/v1alpha1
    kind: VolumeSnapshotClass
    metadata:
      name: csi-rbdplugin-snapclass
    snapshotter: rook-ceph.rbd.csi.ceph.com
    parameters:

    clusterID: rook-ceph
    csi.storage.k8s.io/snapshotter-secret-name: rook-ceph-csi
    csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph

Then I have written this volumesnapshot yaml file to snapshoot "data-nodetodoexample-nodeappexample-0" pvc

    apiVersion: snapshot.storage.k8s.io/v1alpha1
    kind: VolumeSnapshot
    metadata:
      name: new-snapshot-nodeexampleapp-0
    spec:
      snapshotClassName: csi-rbdplugin-snapclass
      source:
        name: data-nodetodoexample-nodeappexample-0
        kind: PersistentVolumeClaim
        
After deploying I will get following volume snapshoot

    kubectl get volumesnapshot
    NAME                            AGE
    snapshot-pvc-nodeappexample-0   5s
    
Now I am creating PersistentVolumeClaim from the snapshot

    apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: restore-pvc-nodeappexample-0
    spec:
      storageClassName: rook-ceph-block
      dataSource:
        name: snapshot-pvc-nodeappexample-0
        kind: VolumeSnapshot
        apiGroup: snapshot.storage.k8s.io
      accessModes:
      - ReadWriteOnce
      resources:
        requests:
          storage: 10Gi

This will create reusable PersistentVolumeClaim
