---
title: AWS Lightsail Containers に GitLab CI でデプロイする
emoji: 🧩
type: tech
topics: [aws, lightsail, gitlab, ci, docker]
published: true
---

# 実際に動かしたもの

実際に試したコードのリポジトリは[こちら](https://gitlab.com/yt-practice/lightsail-container-20201222)

# IAM 権限

AWS Console の GUI で設定しようとしたらコンテナ関係はまだ GUI には設定がないっぽい？
Resource も制限できればなお良いです

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VisualEditor0",
      "Effect": "Allow",
      "Action": [
        "lightsail:CreateContainerServiceRegistryLogin",
        "lightsail:RegisterContainerImage",
        "lightsail:GetContainerImages",
        "lightsail:CreateContainerServiceDeployment"
      ],
      "Resource": "*"
    }
  ]
}
```

# .gitlab-ci.yml

本体を deploy.sh に分離しているので短いです

```yml
services:
  - docker:dind

app-deploy:
  image: ytoune/aws-lightsail-cli
  stage: deploy
  script:
    - echo start
    - sh ./deploy.sh
  only:
    - main
```

## ytoune/aws-lightsail-cli

使用しているイメージは[こちら](https://hub.docker.com/r/ytoune/aws-lightsail-cli)です
今回の用途のために新規作成しました

後述する `aws lightsail push-container-image` が aws-cli と lightsailctl と docker をすべて要求するので
docker をベースに aws-cli と lightsailctl を入れました
json 加工用に Node.js も入れてます

## deploy.sh

`$AWS_ACCESS_KEY_ID` と `$AWS_SECRET_ACCESS_KEY` を使ってくれないみたいなので `~/.aws/credentials` を生成してます

`docker build` したのち
`aws lightsail push-container-image` でイメージを push して
`aws lightsail create-container-service-deployment` でデプロイしています

```shell
set -Ceu

mkdir ~/.aws || echo pass
echo '[default]' >| ~/.aws/credentials
echo "aws_access_key_id=$AWS_ACCESS_KEY_ID" >> ~/.aws/credentials
echo "aws_secret_access_key=$AWS_SECRET_ACCESS_KEY" >> ~/.aws/credentials
echo '[default]' >| ~/.aws/config
echo 'region=ap-northeast-1' >> ~/.aws/config
echo 'output=json' >> ~/.aws/config

docker build -t myapp .

aws lightsail push-container-image --region ap-northeast-1 --service-name ${APP_SERVICE_NAME} --label api --image myapp
aws lightsail get-container-images --service-name ${APP_SERVICE_NAME} | node scripts/make-container.js
aws lightsail create-container-service-deployment --service-name ${APP_SERVICE_NAME} --cli-input-json file://$(pwd)/container.json
```

### scripts/make-container.js

`aws lightsail create-container-service-deployment` で使用する `container.json` を生成してます

```js
const { promises: fs } = require('fs')
const path = require('path')
Promise.resolve()
  .then(async () => {
    const data = await fs.readFile('/dev/stdin', 'utf-8')
    const r = JSON.parse(data)
    const image = r.containerImages[0].image
    await fs.writeFile(
      path.join(__dirname, '../container.json'),
      JSON.stringify({
        containers: {
          api: {
            image,
            command: ['sh', 'start.sh'],
            environment: {},
            ports: {
              80: 'HTTP',
            },
          },
        },
        publicEndpoint: {
          containerName: 'api',
          containerPort: 80,
          healthCheck: {
            healthyThreshold: 2,
            unhealthyThreshold: 2,
            timeoutSeconds: 3,
            intervalSeconds: 5,
            path: '/api/health',
            successCodes: '200-499',
          },
        },
      }),
    )
  })
  .catch(x => {
    console.error(x)
    process.exit(1)
  })
```

# 改善案

docker build がどうしても時間がかかると思うのでどうにかしたいですね
下記のようにビルド済のイメージを毎回どこかに push して
次回それを pull するようにすれば速くなるかもしれません

```shell
docker login -u gitlab-ci-token -p $CI_JOB_TOKEN $CI_REGISTRY_IMAGE
docker pull $CI_REGISTRY_IMAGE:latest || true
docker build --cache-from $CI_REGISTRY_IMAGE:latest --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA --tag $CI_REGISTRY_IMAGE:latest .
docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
docker push $CI_REGISTRY_IMAGE:latest
```

# 参考

[プライベートなコンテナイメージを Amazon Lightsail コンテナサービスで使う](https://dev.classmethod.jp/articles/how-to-use-private-images-with-amazon-lightsail-container-service/)
[Amazon Lightsail API Reference](https://docs.aws.amazon.com/lightsail/2016-11-28/api-reference/Welcome.html)
[AWS Lightsail ContainersにGitHub Actionsでデプロイする。](https://zenn.dev/devneko/articles/196b9befb48b41798071)
[Building Docker images with GitLab CI/CD # Using Docker caching](https://docs.gitlab.com/ee/ci/docker/using_docker_build.html#using-docker-caching)
