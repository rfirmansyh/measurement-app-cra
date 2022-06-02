import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import qs from 'qs';

const devUrl = process.env.REACT_APP_API_LOCAL ? process.env.REACT_APP_API_LOCAL : 'http://127.0.0.1:8000/api';
const API_URL = process.env.REACT_APP_APP_ENV === 'development' ? devUrl : process.env.REACT_APP_API_URL;

interface AxiosInstanceProps extends AxiosRequestConfig {
  isFormData?: boolean,
}
interface AxiosRequestProps extends AxiosInstanceProps {
  url: string,
}
const axiosInstance = (props: AxiosInstanceProps):AxiosInstance => {
  const {
    isFormData,
    ...rest
  } = props;

  const requestHeaders = {
    'Content-Type': isFormData ? 'multipart/form-data' : 'application/x-www-form-urlencoded',
  };

  const instance = axios.create({
    baseURL: API_URL,
    headers: requestHeaders,
    ...rest,
  });

  return instance;
};

export const apiGet = (props: AxiosRequestProps):any => {
  const {
    url,
    params,
    ...rest
  } = props;

  return axiosInstance({ ...rest })
    .get<any>(url, {
      params,
      paramsSerializer: (params) => qs.stringify(params),
      ...rest,
    });
};
export const apiPost = (props: AxiosRequestProps):any => {
  const {
    url,
    data,
    isFormData,
    ...rest
  } = props;

  return axiosInstance({ ...rest })
    .post(
      url,
      !isFormData ? qs.stringify(data) : data,
      { ...rest }
    );
};
export const apiPut = (props: AxiosRequestProps):any => {
  const {
    url,
    data,
    ...rest
  } = props;

  return axiosInstance({ ...rest })
    .put(
      url,
      qs.stringify(data),
      { ...rest }
    );
};
export const apiDelete = (props: AxiosRequestProps):any => {
  const {
    url,
    ...rest
  } = props;

  return axiosInstance({ ...rest })
    .delete(
      url,
      { ...rest }
    );
};
